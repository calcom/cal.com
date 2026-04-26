import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

/**
 * Generates a BigBlueButton API checksum.
 * BBB uses SHA-256: SHA256(actionName + queryString + sharedSecret)
 * @see https://docs.bigbluebutton.org/development/api#api-security-model
 */
function bbbChecksum(action: string, queryString: string, secret: string): string {
  return createHash("sha256")
    .update(action + queryString + secret)
    .digest("hex");
}

/**
 * Makes an authenticated call to the BigBlueButton API.
 */
async function bbbApiCall(
  baseUrl: string,
  secret: string,
  action: string,
  params: Record<string, string>
): Promise<Record<string, string | undefined>> {
  const queryString = new URLSearchParams(params).toString();
  const checksum = bbbChecksum(action, queryString, secret);
  const url = `${baseUrl}/${action}?${queryString}&checksum=${checksum}`;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/xml" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`BigBlueButton API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  const returnCode = text.match(/<returncode>(\w+)<\/returncode>/)?.[1];
  if (returnCode === "FAILED") {
    const messageKey = text.match(/<messageKey>([^<]+)<\/messageKey>/)?.[1];
    const message = text.match(/<message>([^<]+)<\/message>/)?.[1];
    throw new Error(`BigBlueButton API failed: ${messageKey} - ${message}`);
  }

  return {
    returnCode,
    meetingID: text.match(/<meetingID>([^<]+)<\/meetingID>/)?.[1],
    attendeePW: text.match(/<attendeePW>([^<]+)<\/attendeePW>/)?.[1],
    moderatorPW: text.match(/<moderatorPW>([^<]+)<\/moderatorPW>/)?.[1],
  };
}

/**
 * Generates a BigBlueButton join URL for an attendee.
 */
function buildJoinUrl(
  baseUrl: string,
  secret: string,
  meetingID: string,
  fullName: string,
  password: string
): string {
  const params = {
    meetingID,
    fullName,
    password,
    redirect: "true",
  };
  const queryString = new URLSearchParams(params).toString();
  const checksum = bbbChecksum("join", queryString, secret);
  return `${baseUrl}/join?${queryString}&checksum=${checksum}`;
}

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = (appKeys.bbb_url as string)?.replace(/\/+$/, "");
      const bbbSecret = appKeys.bbb_secret as string;

      if (!bbbUrl || !bbbSecret) {
        throw new Error(
          "BigBlueButton is not configured. Please set the server URL and shared secret in app settings."
        );
      }

      const meetingID = uuidv4();
      const attendeePW = uuidv4().replace(/-/g, "").substring(0, 12);
      const moderatorPW = uuidv4().replace(/-/g, "").substring(0, 12);

      // Sanitize title: strip control characters, trim, and cap length for BBB API.
      const meetingName = (event.title || "Meeting")
        .replace(/[\x00-\x1F]/g, " ")
        .trim()
        .substring(0, 200);

      await bbbApiCall(bbbUrl, bbbSecret, "create", {
        name: meetingName,
        meetingID,
        attendeePW,
        moderatorPW,
        autoStartRecording: "false",
        allowStartStopRecording: "true",
        record: "false",
      });

      // The public URL uses attendeePW so attendees join without moderator privileges.
      // The organizer's cal.diy booking confirmation will show the same join link;
      // moderator access can be obtained by re-joining with moderatorPW via the BBB server directly.
      const url = buildJoinUrl(bbbUrl, bbbSecret, meetingID, "Guest", attendeePW);

      // Store moderatorPW in the id field as a composite "meetingID|moderatorPW" so
      // deleteMeeting can retrieve the moderator password required by the BBB end API.
      return {
        type: metadata.type,
        id: `${meetingID}|${moderatorPW}`,
        password: attendeePW,
        url,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = (appKeys.bbb_url as string)?.replace(/\/+$/, "");
      const bbbSecret = appKeys.bbb_secret as string;

      if (!bbbUrl || !bbbSecret) return;

      try {
        // The uid is stored as "meetingID|moderatorPW" (set in createMeeting).
        // The BBB end API requires password=moderatorPW to authorise the end request.
        const [meetingID, moderatorPW] = uid.split("|");
        await bbbApiCall(bbbUrl, bbbSecret, "end", { meetingID, password: moderatorPW });
      } catch {
        // Meeting may have already ended naturally; this is acceptable.
      }
    },

    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: metadata.type,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
