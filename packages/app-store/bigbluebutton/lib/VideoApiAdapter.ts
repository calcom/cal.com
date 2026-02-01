import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

/**
 * Generate a checksum for BigBlueButton API calls
 * The checksum is SHA-1(apiName + queryString + secret)
 */
const generateChecksum = (apiName: string, queryString: string, secret: string): string => {
  const data = apiName + queryString + secret;
  return crypto.createHash("sha1").update(data).digest("hex");
};

/**
 * Build query string from params object
 */
const buildQueryString = (params: Record<string, string>): string => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
};

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const bbbUrl = (appKeys.bbbUrl as string) || "";
      const bbbSecret = (appKeys.bbbSecret as string) || "";

      if (!bbbUrl || !bbbSecret) {
        throw new Error("BigBlueButton URL and Secret are required. Please configure them in the app settings.");
      }

      // Ensure URL ends with /api/
      const apiBase = bbbUrl.endsWith("/")
        ? `${bbbUrl}api/`
        : bbbUrl.endsWith("/api/")
          ? bbbUrl
          : `${bbbUrl}/api/`;

      const meetingID = uuidv4();
      const meetingName = eventData.title || "Cal.com Meeting";
      const attendeePassword = uuidv4().substring(0, 8);
      const moderatorPassword = uuidv4().substring(0, 8);

      // Create meeting params
      const createParams: Record<string, string> = {
        name: meetingName,
        meetingID: meetingID,
        attendeePW: attendeePassword,
        moderatorPW: moderatorPassword,
        welcome: `Welcome to ${meetingName}`,
        record: "false",
        autoStartRecording: "false",
        allowStartStopRecording: "true",
      };

      const createQueryString = buildQueryString(createParams);
      const createChecksum = generateChecksum("create", createQueryString, bbbSecret);
      const createUrl = `${apiBase}create?${createQueryString}&checksum=${createChecksum}`;

      // Call BigBlueButton API to create the meeting
      const response = await fetch(createUrl);

      if (!response.ok) {
        throw new Error(`Failed to create BigBlueButton meeting: ${response.statusText}`);
      }

      const responseText = await response.text();

      // Parse XML response to check for success
      if (!responseText.includes("<returncode>SUCCESS</returncode>")) {
        // Extract error message if available
        const messageMatch = responseText.match(/<message>(.*?)<\/message>/);
        const errorMessage = messageMatch ? messageMatch[1] : "Unknown error";
        throw new Error(`BigBlueButton API error: ${errorMessage}`);
      }

      // Generate join URL for moderator (organizer)
      const joinParams: Record<string, string> = {
        meetingID: meetingID,
        password: moderatorPassword,
        fullName: eventData.organizer.name || "Organizer",
        redirect: "true",
      };

      const joinQueryString = buildQueryString(joinParams);
      const joinChecksum = generateChecksum("join", joinQueryString, bbbSecret);
      const joinUrl = `${apiBase}join?${joinQueryString}&checksum=${joinChecksum}`;

      return Promise.resolve({
        type: metadata.type,
        id: meetingID,
        password: attendeePassword,
        url: joinUrl,
      });
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const bbbUrl = (appKeys.bbbUrl as string) || "";
      const bbbSecret = (appKeys.bbbSecret as string) || "";

      if (!bbbUrl || !bbbSecret) {
        return Promise.resolve();
      }

      const apiBase = bbbUrl.endsWith("/")
        ? `${bbbUrl}api/`
        : bbbUrl.endsWith("/api/")
          ? bbbUrl
          : `${bbbUrl}/api/`;

      const endParams: Record<string, string> = {
        meetingID: uid,
        password: "", // We don't store moderator password, but end might still work
      };

      const endQueryString = buildQueryString(endParams);
      const endChecksum = generateChecksum("end", endQueryString, bbbSecret);
      const endUrl = `${apiBase}end?${endQueryString}&checksum=${endChecksum}`;

      try {
        await fetch(endUrl);
      } catch {
        // Ignore errors when ending meeting
      }

      return Promise.resolve();
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
