import { v4 as uuidv4 } from "uuid";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";
import { BBBApi } from "./bbb-api";

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const serverUrl = appKeys.serverUrl as string;
      const sharedSecret = appKeys.sharedSecret as string;

      if (!serverUrl || !sharedSecret) {
        throw new Error("BigBlueButton configuration missing. Please configure server URL and shared secret.");
      }

      // Generate unique meeting ID and passwords
      const meetingID = `cal-${uuidv4()}`;
      const moderatorPassword = uuidv4().substring(0, 8);
      const attendeePassword = uuidv4().substring(0, 8);

      // Create meeting name
      const meetingName = eventData.title || "Cal.com Meeting";

      try {
        const bbbApi = new BBBApi({ serverUrl, sharedSecret });

        // Create the meeting
        await bbbApi.createMeeting({
          meetingID,
          name: meetingName,
          moderatorPW: moderatorPassword,
          attendeePW: attendeePassword,
          welcome: `Welcome to ${meetingName}! Please wait for the host to start the meeting.`,
          maxParticipants: 50,
        });

        // Generate attendee join URL as the canonical meeting URL (safe for sharing)
        const attendeeJoinUrl = bbbApi.getJoinUrl({
          meetingID,
          fullName: "Participant",
          password: attendeePassword,
          userID: "participant",
          role: "viewer",
        });

        return {
          type: metadata.type,
          id: `${meetingID}|${moderatorPassword}|${serverUrl}`, // Store structured meeting data
          password: attendeePassword, // Standard semantic: password for meeting access
          url: attendeeJoinUrl, // Safe attendee URL as canonical URL
        };
      } catch (error) {
        console.error("Failed to create BigBlueButton meeting:", error);
        throw new Error(
          error instanceof Error 
            ? `BigBlueButton meeting creation failed: ${error.message}`
            : "Failed to create BigBlueButton meeting"
        );
      }
    },

    deleteMeeting: async (bookingRef: PartialReference): Promise<void> => {
      if (!bookingRef.meetingId) {
        return;
      }

      try {
        // Parse structured meeting ID: meetingID|moderatorPassword|serverUrl
        const idParts = bookingRef.meetingId.split("|");
        if (idParts.length !== 3) {
          console.warn("Invalid BigBlueButton meeting ID format for deletion");
          return;
        }

        const [actualMeetingId, moderatorPassword, storedServerUrl] = idParts;

        // Get app keys for shared secret (server URL comes from meeting ID)
        const appKeys = await getAppKeysFromSlug(metadata.slug);
        const sharedSecret = appKeys.sharedSecret as string;

        if (!sharedSecret) {
          console.warn("BigBlueButton shared secret missing for meeting deletion");
          return;
        }

        const bbbApi = new BBBApi({ 
          serverUrl: storedServerUrl, 
          sharedSecret 
        });

        await bbbApi.endMeeting(actualMeetingId, moderatorPassword);
      } catch (error) {
        console.error("Failed to end BigBlueButton meeting:", error);
        // Don't throw error for deletion failures to avoid blocking booking cancellation
      }
    },

    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      // For BBB, we just return the existing meeting info
      // BBB meetings are stateless and don't need updating
      
      const meetingId = bookingRef.meetingId as string;
      const attendeePassword = bookingRef.meetingPassword as string;
      const meetingUrl = bookingRef.meetingUrl as string;

      return Promise.resolve({
        type: metadata.type,
        id: meetingId,
        password: attendeePassword, // Standard attendee password
        url: meetingUrl,
      });
    },

    /**
     * Generate attendee join URL for guests
     */
    getGuestJoinUrl: async (
      structuredMeetingId: string,
      guestName: string,
      attendeePassword: string
    ): Promise<string> => {
      // Parse structured meeting ID: meetingID|moderatorPassword|serverUrl
      const [actualMeetingId, , serverUrl] = structuredMeetingId.split("|");
      
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const sharedSecret = appKeys.sharedSecret as string;
      
      const bbbApi = new BBBApi({ serverUrl, sharedSecret });
      
      return bbbApi.getJoinUrl({
        meetingID: actualMeetingId,
        fullName: guestName || "Guest",
        password: attendeePassword,
        userID: `guest-${Date.now()}`,
        role: "viewer",
      });
    },

    /**
     * Generate moderator join URL for organizers
     */
    getModeratorJoinUrl: async (
      structuredMeetingId: string,
      organizerName: string
    ): Promise<string> => {
      // Parse structured meeting ID: meetingID|moderatorPassword|serverUrl
      const [actualMeetingId, moderatorPassword, serverUrl] = structuredMeetingId.split("|");
      
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const sharedSecret = appKeys.sharedSecret as string;
      
      const bbbApi = new BBBApi({ serverUrl, sharedSecret });
      
      return bbbApi.getJoinUrl({
        meetingID: actualMeetingId,
        fullName: organizerName || "Host", 
        password: moderatorPassword,
        userID: "moderator",
        role: "moderator",
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;