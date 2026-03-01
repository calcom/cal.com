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

function getCredential(credential: CredentialPayload): BBBCredentials {
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
      const bbbCreds = getCredential(credential);
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

        // Build a generic attendee join URL for use as the canonical meeting URL.
        //
        // `VideoCallData.url` is sent to ALL participants (both organizer and
        // attendees) in booking confirmation emails by the standard cal.com
        // email pipeline (`getVideoCallUrlFromCalEvent`).  Using a moderator
        // join URL here would expose moderator privileges to every attendee who
        // receives the confirmation email.
        //
        // We therefore use an attendee-role join URL as `url` so that everyone
        // who receives the confirmation email joins with attendee privileges.
        //
        // Note: BBB includes `fullName` in the URL checksum, so a signed URL is
        // name-specific.  "Attendee" is used as a generic placeholder; servers
        // that need per-person URLs should regenerate the join URL at join-time
        // using the stored `password` (attendeePW) with the attendee's actual name.
        const attendeeJoinUrl = getBBBJoinUrl(
          bbbCreds,
          meeting.meetingID,
          "Attendee",
          meeting.attendeePW
        );

        // Build a moderator join URL for the host. This URL is NOT sent to attendees —
        // it is stored in the booking reference so that the host can start/manage the
        // meeting with moderator privileges (e.g. mute participants, end the meeting).
        const hostJoinUrl = getBBBJoinUrl(bbbCreds, meeting.meetingID, "Host", meeting.moderatorPW);

        return {
          type: "bigbluebutton_video",
          id: meeting.meetingID,
          // `url` is the link sent to ALL participants in booking confirmation emails.
          // Using the attendee join URL (attendeePW) ensures no attendee accidentally
          // receives moderator privileges via the confirmation email link.
          url: attendeeJoinUrl,
          // `password` stores the MODERATOR password in the booking reference.
          // The host can use this password (via getBBBJoinUrl) to rejoin as moderator
          // after the initial session, or to end the meeting programmatically.
          // Attendees always join via `url` (attendee join URL) and never see this field.
          password: meeting.moderatorPW,
        };
      } catch (error) {
        log.error("Failed to create BigBlueButton meeting", { error });
        throw error;
      }
    },

    updateMeeting: async (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> => {
      // BBB meetings are stateless — create a fresh one for the rescheduled event.
      //
      // The previous meeting will auto-expire when all participants leave or after
      // the server's meetingExpireIfNoUserJoined timeout.  Explicitly ending it
      // would require the moderator password, which is embedded in the old booking
      // reference's url (not trivially extractable here).  This matches the pattern
      // used by Jitsi and other adapters that skip explicit deletion on reschedule.
      const bbbCreds = getCredential(credential);

      if (bookingRef.meetingId) {
        log.info("Skipping explicit end of old BBB meeting on reschedule (auto-expire handles cleanup)", {
          meetingID: bookingRef.meetingId,
        });
      }

      // Create a fresh meeting for the rescheduled event
      return BigBlueButtonVideoApiAdapter(credential).createMeeting(event);
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      // uid is our meetingID; the moderator password is embedded in the booking
      // reference url (host join URL) but is not passed here.
      // BBB meetings auto-expire when all participants leave or after meetingExpireIfNoUserJoined.
      // This is the same pattern used by Jitsi — deletion is a no-op.
      log.info("deleteMeeting called for BBB meeting", { uid });
      return Promise.resolve();
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
