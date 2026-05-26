import { randomBytes } from "node:crypto";

import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { metadata } from "../_metadata";
import { buildApiUrl } from "./bbb";
import { getBigBlueButtonAppKeys } from "./getBigBlueButtonAppKeys";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton/lib/VideoApiAdapter"] });

function generateMeetingId(): string {
  return randomBytes(8).toString("hex");
}

function generatePassword(): string {
  return randomBytes(6).toString("hex");
}

/**
 * Returns a join URL for the given meeting. We pass `redirect=true` so the
 * BBB server issues a 302 to the actual conference once the user is checked
 * in, which is the behaviour every other Cal.com video adapter exposes.
 */
function buildJoinUrl(params: {
  url: string;
  secret: string;
  meetingID: string;
  fullName: string;
  password: string;
}): string {
  return buildApiUrl(
    { url: params.url, secret: params.secret },
    "join",
    {
      meetingID: params.meetingID,
      fullName: params.fullName,
      password: params.password,
      redirect: "true",
    }
  );
}

const BigBlueButtonApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => Promise.resolve([]),

    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const { bbb_url, bbb_secret } = await getBigBlueButtonAppKeys();

      const meetingID = generateMeetingId();
      const attendeePW = generatePassword();
      const moderatorPW = generatePassword();

      const createUrl = buildApiUrl(
        { url: bbb_url, secret: bbb_secret },
        "create",
        {
          name: event.title,
          meetingID,
          attendeePW,
          moderatorPW,
          welcome: event.description ?? "",
          record: "false",
          autoStartRecording: "false",
          allowStartStopRecording: "true",
        }
      );

      const response = await fetch(createUrl, { method: "GET" });
      if (!response.ok) {
        log.error(`BigBlueButton create call failed with status ${response.status}`);
        throw new Error("Unable to create BigBlueButton meeting");
      }
      const body = await response.text();
      if (!/<returncode>SUCCESS<\/returncode>/i.test(body)) {
        log.error(`BigBlueButton create call returned a failure: ${body}`);
        throw new Error("BigBlueButton rejected the create request");
      }

      const moderatorName = event.organizer?.name ?? "Moderator";
      const joinUrl = buildJoinUrl({
        url: bbb_url,
        secret: bbb_secret,
        meetingID,
        fullName: moderatorName,
        password: moderatorPW,
      });

      return {
        type: metadata.type,
        id: meetingID,
        password: moderatorPW,
        url: joinUrl,
      };
    },

    deleteMeeting: async (meetingID: string): Promise<void> => {
      if (!meetingID) return;
      const { bbb_url, bbb_secret } = await getBigBlueButtonAppKeys();
      const endUrl = buildApiUrl(
        { url: bbb_url, secret: bbb_secret },
        "end",
        { meetingID, password: "" }
      );
      try {
        await fetch(endUrl, { method: "GET" });
      } catch (err) {
        log.warn(`Failed to end BigBlueButton meeting ${meetingID}`, err);
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

export default BigBlueButtonApiAdapter;
