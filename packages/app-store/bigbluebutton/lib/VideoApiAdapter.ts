import crypto from "crypto";

import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

/**
 * Generates a BigBlueButton checksum for API authentication.
 * @see https://docs.bigbluebutton.org/dev/api.html#api-security-model
 */
function generateChecksum(callName: string, queryString: string, secret: string): string {
  const str = callName + queryString + secret;
  return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Builds a BigBlueButton API URL with authentication checksum.
 */
function buildBBBUrl(baseUrl: string, callName: string, params: Record<string, string>, secret: string): string {
  const queryString = new URLSearchParams(params).toString();
  const checksum = generateChecksum(callName, queryString, secret);
  return `${baseUrl}/bigbluebutton/api/${callName}?${queryString}&checksum=${checksum}`;
}

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const bbbUrl = (appKeys.bbbUrl as string)?.replace(/\/$/, "");
      const bbbSecret = appKeys.bbbSecret as string;

      if (!bbbUrl || !bbbSecret) {
        throw new Error("BigBlueButton URL and Secret are required. Please configure the app settings.");
      }

      const meetingID = uuidv4();
      const meetingName = eventData.title;

      // Create the meeting via BBB API
      const createParams: Record<string, string> = {
        name: meetingName,
        meetingID,
        attendeePW: uuidv4().slice(0, 8),
        moderatorPW: uuidv4().slice(0, 8),
        record: "false",
        autoStartRecording: "false",
        allowStartStopRecording: "true",
      };

      const createUrl = buildBBBUrl(bbbUrl, "create", createParams, bbbSecret);

      // Make API call to create the meeting
      const response = await fetch(createUrl);
      if (!response.ok) {
        throw new Error(`BigBlueButton API error: ${response.statusText}`);
      }

      // Build join URL for moderator (organizer)
      const joinModeratorParams: Record<string, string> = {
        fullName: eventData.organizer.name,
        meetingID,
        password: createParams.moderatorPW,
        redirect: "true",
      };

      const joinUrl = buildBBBUrl(bbbUrl, "join", joinModeratorParams, bbbSecret);

      return {
        type: metadata.type,
        id: meetingID,
        password: createParams.moderatorPW,
        url: joinUrl,
      };
    },

    deleteMeeting: async (): Promise<void> => {
      // BigBlueButton meetings auto-close when all participants leave
      Promise.resolve();
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
