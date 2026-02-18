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

        // Build the organizer (moderator) join URL.
        const organizerName = event.organizer?.name ?? "Host";
        const hostJoinUrl = getBBBJoinUrl(
          bbbCreds,
          meeting.meetingID,
          organizerName,
          meeting.moderatorPW
        );

        // BBB includes `fullName` in the URL checksum, so a URL generated for one
        // attendee's name is not reusable by others.  We store the attendeePW and
        // moderatorPW so that each participant can generate their own signed join URL
        // at the point of joining (e.g. via a server-side join redirect endpoint).
        //
        // The `url` field here serves as the booking-confirmation link.  We use a
        // generic placeholder name "Attendee" — this URL will route each participant
        // into the meeting; BBB will prompt them for their name on the client side if
        // the server is configured to do so, or they can use the per-person join
        // endpoint to get a properly-named link.
        const attendeeJoinUrl = getBBBJoinUrl(
          bbbCreds,
          meeting.meetingID,
          "Attendee",
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
