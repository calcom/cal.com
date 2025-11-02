import { randomBytes } from "crypto";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { metadata } from "../_metadata";

/**
 * Infomaniak kMeet Video API Adapter
 *
 * Uses the simple URL-based approach: no API calls needed, just generate a unique room URL.
 * Format: https://kmeet.infomaniak.com/${UNIQUE_ID}
 */
const KMeetVideoApiAdapter = (_credential: CredentialPayload): VideoApiAdapter => {
  const KMEET_BASE_URL = "https://kmeet.infomaniak.com";

  /**
   * Generates a secure random identifier for the meeting room
   */
  const generateRoomId = (): string => {
    return randomBytes(16).toString("hex");
  };

  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (_eventData: CalendarEvent): Promise<VideoCallData> => {
      // Generate a unique room ID
      const roomId = generateRoomId();
      const meetingUrl = `${KMEET_BASE_URL}/${roomId}`;

      return {
        type: metadata.type,
        id: roomId,
        password: "",
        url: meetingUrl,
      };
    },

    deleteMeeting: async (_uid: string): Promise<void> => {
      // No deletion needed - rooms are created on-demand when accessed
      return Promise.resolve();
    },

    updateMeeting: async (bookingRef: PartialReference, _eventData: CalendarEvent): Promise<VideoCallData> => {
      // Return existing meeting data - no update needed
      return Promise.resolve({
        type: metadata.type,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default KMeetVideoApiAdapter;