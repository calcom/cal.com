import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

interface BBBCreateResponse {
  returncode: string;
  meetingID: string;
  internalMeetingID: string;
  parentMeetingID: string;
  attendeePW: string;
  moderatorPW: string;
  createTime: string;
  voiceBridge: string;
  dialNumber: string;
  createDate: string;
  hasUserJoined: string;
  duration: string;
  hasBeenForciblyEnded: string;
  messageKey: string;
  message: string;
}

function generateChecksum(apiCall: string, queryString: string, secret: string): string {
  const data = apiCall + queryString + secret;
  return crypto.createHash("sha1").update(data).digest("hex");
}

function buildApiUrl(
  baseUrl: string,
  apiCall: string,
  params: Record<string, string>,
  secret: string
): string {
  const queryString = new URLSearchParams(params).toString();
  const checksum = generateChecksum(apiCall, queryString, secret);
  return `${baseUrl}/bigbluebutton/api/${apiCall}?${queryString}&checksum=${checksum}`;
}

async function parseXmlResponse(response: Response): Promise<Record<string, string>> {
  const text = await response.text();
  const result: Record<string, string> = {};

  // Simple XML parsing for BBB responses
  const regex = /<(\w+)>([^<]*)<\/\1>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    result[match[1]] = match[2];
  }

  return result;
}

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const bbbUrl = appKeys.bbbUrl as string;
      const bbbSecret = appKeys.bbbSecret as string;

      if (!bbbUrl || !bbbSecret) {
        throw new Error("BigBlueButton URL or secret not configured");
      }

      const meetingID = uuidv4();
      const moderatorPW = uuidv4().substring(0, 8);
      const attendeePW = uuidv4().substring(0, 8);

      // Create meeting params
      const createParams: Record<string, string> = {
        name: event.title,
        meetingID,
        moderatorPW,
        attendeePW,
        welcome: `Welcome to ${event.title}`,
        record: "false",
        autoStartRecording: "false",
        allowStartStopRecording: "false",
      };

      if (event.description) {
        createParams.meta_description = event.description.substring(0, 200);
      }

      // Create meeting
      const createUrl = buildApiUrl(bbbUrl, "create", createParams, bbbSecret);
      const createResponse = await fetch(createUrl);

      if (!createResponse.ok) {
        throw new Error(`BigBlueButton API error: ${createResponse.status}`);
      }

      const createResult = await parseXmlResponse(createResponse);

      if (createResult.returncode !== "SUCCESS") {
        throw new Error(`BigBlueButton create failed: ${createResult.message || "Unknown error"}`);
      }

      // Generate moderator join URL (for organizer)
      const joinParams: Record<string, string> = {
        fullName: event.organizer.name || "Moderator",
        meetingID,
        role: "MODERATOR",
      };

      const joinUrl = buildApiUrl(bbbUrl, "join", joinParams, bbbSecret);

      return {
        type: metadata.type,
        id: meetingID,
        password: moderatorPW,
        url: joinUrl,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const bbbUrl = appKeys.bbbUrl as string;
      const bbbSecret = appKeys.bbbSecret as string;

      if (!bbbUrl || !bbbSecret) {
        return;
      }

      // End meeting
      const endParams: Record<string, string> = {
        meetingID: uid,
        password: "", // moderator password required but we don't store it
      };

      try {
        const endUrl = buildApiUrl(bbbUrl, "end", endParams, bbbSecret);
        await fetch(endUrl);
      } catch {
        // Ignore errors when ending meeting
      }
    },

    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      // BBB doesn't support updating meetings, return existing data
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
