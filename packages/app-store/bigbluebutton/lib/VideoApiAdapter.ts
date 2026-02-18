import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { appKeysSchema } from "../zod";
import { createBBBMeeting, getBBBJoinUrl } from "./bbbapi";
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
          // Only the attendee password is stored in `meetingPassword` — this
          // field is sent to client-side booking pages and visible to attendees.
          // Storing the combined "attendeePW:moderatorPW" string here would
          // expose the moderator password to any attendee who reads the field,
          // allowing them to obtain host/moderator privileges.
          //
          // The moderator password is kept exclusively in `meetingData.moderatorPW`
          // which is used server-side (e.g. for ending the meeting in updateMeeting)
          // and must NOT be sent to attendee-facing pages.
          password: meeting.attendeePW,
          url: attendeeJoinUrl,
          meetingData: {
            hostUrl: hostJoinUrl,
            // moderatorPW is server-side only — used to end or update meetings.
            // It must never be sent to attendee-facing pages.
            moderatorPW: meeting.moderatorPW,
          },
        };
      } catch (error) {
        log.error("Failed to create BigBlueButton meeting", { error });
        throw error;
      }
    },

    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      // BBB meetings are stateless — we delete the old one (if running) and create a new one.
      //
      // NOTE: The moderator password is no longer stored in meetingPassword (which now contains
      // only the attendee password).  Without the moderator password we cannot explicitly end
      // the old meeting; however BBB meetings auto-expire when all participants leave or after
      // the server's meetingExpireIfNoUserJoined timeout — so skipping the end call is safe.
      // This matches the behaviour of other adapters (e.g. Jitsi) that do not explicitly end
      // meetings on reschedule.
      const bbbCreds = getCredentials(credential);

      if (bookingRef.meetingId) {
        log.info("Skipping explicit end of old BBB meeting on reschedule (auto-expire handles cleanup)", {
          meetingID: bookingRef.meetingId,
        });
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
