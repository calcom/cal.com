import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { appKeysSchema } from "../zod";
import { createBBBMeeting, endBBBMeeting, getBBBJoinUrl } from "./bbbapi";
import type { BBBCredentials } from "./bbbapi";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton/lib/VideoApiAdapter"] });

function getCredentials(credential: CredentialPayload): BBBCredentials {
  const keys = appKeysSchema.parse(credential.key);
  return {
    serverUrl: keys.serverUrl,
    sharedSecret: keys.sharedSecret,
    checksumAlgorithm: keys.checksumAlgorithm,
  };
}

const BigBlueButtonVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  return {
    getAvailability: () => Promise.resolve([]),

    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const bbbCreds = getCredentials(credential);
      const meetingID = uuidv4();
      // Generate random passwords for attendees and moderators
      const attendeePW = uuidv4().slice(0, 12);
      const moderatorPW = uuidv4().slice(0, 12);

      try {
        const meeting = await createBBBMeeting(bbbCreds, {
          name: event.title,
          meetingID,
          attendeePW,
          moderatorPW,
          logoutURL: event.organizer?.email
            ? `mailto:${event.organizer.email}`
            : undefined,
        });

        // Build the attendee join URL using the first attendee's name as placeholder.
        // Actual attendees will join via the attendee password; organizer via moderator PW.
        // We embed the moderator join URL as the "host" URL in the meeting metadata.
        const organizerName = event.organizer?.name ?? "Host";
        const hostJoinUrl = getBBBJoinUrl(
          bbbCreds,
          meeting.meetingID,
          organizerName,
          meeting.moderatorPW
        );

        // The attendee join URL is stored in `url` and shared in the booking confirmation.
        // We store both passwords (attendeePW + moderatorPW) separated by ":" so
        // the organizer's join link can be generated on the join API endpoint.
        const attendeeName = event.attendees?.[0]?.name ?? "Attendee";
        const attendeeJoinUrl = getBBBJoinUrl(
          bbbCreds,
          meeting.meetingID,
          attendeeName,
          meeting.attendeePW
        );

        return {
          type: "bigbluebutton_video",
          id: meeting.meetingID,
          // password stores "attendeePW:moderatorPW" for use in the join API endpoint
          password: `${meeting.attendeePW}:${meeting.moderatorPW}`,
          url: attendeeJoinUrl,
          // Organizer link stored in meetingData for the confirmation email
          meetingData: {
            hostUrl: hostJoinUrl,
          },
        };
      } catch (error) {
        log.error("Failed to create BigBlueButton meeting", { error });
        throw error;
      }
    },

    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      // BBB meetings are stateless — we delete the old one (if running) and create a new one.
      const bbbCreds = getCredentials(credential);

      if (bookingRef.meetingId && bookingRef.meetingPassword) {
        const [, moderatorPW] = (bookingRef.meetingPassword ?? ":").split(":");
        try {
          if (moderatorPW) {
            await endBBBMeeting(bbbCreds, bookingRef.meetingId, moderatorPW);
          }
        } catch (err) {
          // Meeting may have already ended — log but don't fail the update
          log.warn("Could not end existing BBB meeting during update (may already be ended)", {
            meetingID: bookingRef.meetingId,
            err,
          });
        }
      }

      // Create a fresh meeting for the rescheduled event
      return BigBlueButtonVideoApiAdapter(credential).createMeeting(event);
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      // uid is our meetingID; password stored separately in bookingRef.meetingPassword
      // We cannot end the meeting here without the moderator PW, which isn't passed.
      // BBB meetings auto-expire when all participants leave or after meetingExpireIfNoUserJoined.
      // This is the same pattern used by Jitsi — deletion is a no-op.
      log.info("deleteMeeting called for BBB meeting", { uid });
      return Promise.resolve();
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
