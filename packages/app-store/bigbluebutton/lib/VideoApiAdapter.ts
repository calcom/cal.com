import { createHash, randomUUID } from "node:crypto";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type {
  VideoApiAdapter,
  VideoCallData,
} from "@calcom/types/VideoApiAdapter";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

type BigBlueButtonKeys = {
  bigBlueButtonServerUrl?: string;
  bigBlueButtonSharedSecret?: string;
};

const normalizeApiUrl = (serverUrl: string) => {
  const url = serverUrl.trim().replace(/\/+$/, "");
  return url.endsWith("/bigbluebutton/api") ? url : `${url}/bigbluebutton/api`;
};

const checksum = (method: string, query: string, sharedSecret: string) =>
  createHash("sha1").update(`${method}${query}${sharedSecret}`).digest("hex");

const deriveMeetingPassword = (
  role: "attendee" | "moderator",
  meetingID: string,
  sharedSecret: string,
) =>
  createHash("sha256")
    .update(`${role}:${meetingID}:${sharedSecret}`)
    .digest("hex")
    .slice(0, 24);

const buildApiUrl = (
  apiUrl: string,
  method: string,
  params: URLSearchParams,
  sharedSecret: string,
) => {
  const query = params.toString();
  const signedQuery = new URLSearchParams(params);
  signedQuery.set("checksum", checksum(method, query, sharedSecret));
  return `${apiUrl}/${method}?${signedQuery.toString()}`;
};

const assertSuccessResponse = async (response: Response) => {
  const body = await response.text();

  if (!response.ok || !body.includes("<returncode>SUCCESS</returncode>")) {
    throw new Error(`BigBlueButton API request failed: ${body}`);
  }
};

const getBigBlueButtonConfig = async () => {
  const appKeys = (await getAppKeysFromSlug(
    metadata.slug,
  )) as BigBlueButtonKeys;
  const serverUrl = appKeys.bigBlueButtonServerUrl?.trim();
  const sharedSecret = appKeys.bigBlueButtonSharedSecret?.trim();

  if (!serverUrl || !sharedSecret) {
    throw new Error("BigBlueButton server URL and shared secret are required");
  }

  return {
    apiUrl: normalizeApiUrl(serverUrl),
    sharedSecret,
  };
};

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: (): Promise<EventBusyDate[]> => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const { apiUrl, sharedSecret } = await getBigBlueButtonConfig();
      const meetingID = eventData.uid || randomUUID();
      const attendeePassword = deriveMeetingPassword(
        "attendee",
        meetingID,
        sharedSecret,
      );
      const moderatorPassword = deriveMeetingPassword(
        "moderator",
        meetingID,
        sharedSecret,
      );

      const createParams = new URLSearchParams({
        name: eventData.title,
        meetingID,
        attendeePW: attendeePassword,
        moderatorPW: moderatorPassword,
        record: "false",
      });

      const createUrl = buildApiUrl(
        apiUrl,
        "create",
        createParams,
        sharedSecret,
      );
      await assertSuccessResponse(await fetch(createUrl));

      // Store a join URL using the organizer name. updateMeeting regenerates
      // the URL with each attendee's real display name at notification time.
      const organizerName = eventData.organizer.name || "Attendee";
      const joinParams = new URLSearchParams({
        fullName: organizerName,
        meetingID,
        password: attendeePassword,
        redirect: "true",
      });

      return {
        type: metadata.type,
        id: meetingID,
        password: attendeePassword,
        url: buildApiUrl(apiUrl, "join", joinParams, sharedSecret),
      };
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      const { apiUrl, sharedSecret } = await getBigBlueButtonConfig();
      const moderatorPassword = deriveMeetingPassword(
        "moderator",
        uid,
        sharedSecret,
      );

      const endParams = new URLSearchParams({
        meetingID: uid,
        password: moderatorPassword,
      });

      const endResponse = await fetch(
        buildApiUrl(apiUrl, "end", endParams, sharedSecret),
      );
      const endBody = await endResponse.text();
      // BBB returns FAILED with messageKey=notFound for meetings that have
      // already ended or never existed — treat this as a successful no-op.
      const alreadyGone =
        endBody.includes("notFound") ||
        endBody.includes("endWhenNoModerator");
      if (!alreadyGone) {
        if (
          !endResponse.ok ||
          !endBody.includes("<returncode>SUCCESS</returncode>")
        ) {
          throw new Error(`BigBlueButton API request failed: ${endBody}`);
        }
      }
    },
    updateMeeting: async (
      bookingRef: PartialReference,
      eventData: CalendarEvent,
    ): Promise<VideoCallData> => {
      const { apiUrl, sharedSecret } = await getBigBlueButtonConfig();
      const meetingID = bookingRef.meetingId as string;
      const attendeePassword = bookingRef.meetingPassword as string;
      const attendeeName =
        eventData.attendees?.[0]?.name || eventData.organizer.name;

      if (!meetingID || !attendeePassword) {
        throw new ErrorWithCode(
          ErrorCode.BadRequest,
          "BigBlueButton booking reference is missing meeting data",
        );
      }

      const joinParams = new URLSearchParams({
        fullName: attendeeName,
        meetingID,
        password: attendeePassword,
        redirect: "true",
      });

      return {
        type: metadata.type,
        id: meetingID,
        password: attendeePassword,
        url: buildApiUrl(apiUrl, "join", joinParams, sharedSecret),
      };
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
