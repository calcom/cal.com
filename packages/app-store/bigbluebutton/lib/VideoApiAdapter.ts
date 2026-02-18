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
        // VideoCallData.url is used as the organizer's join link in booking confirmation
        // emails.  It must be a moderator join URL so the host has full meeting control
        // (mute participants, end meeting, etc.) when they click the link.
        const organizerName = event.organizer?.name ?? "Host";
        const hostJoinUrl = getBBBJoinUrl(
          bbbCreds,
          meeting.meetingID,
          organizerName,
          meeting.moderatorPW
        );

        // Build a generic attendee join URL.
        // BBB includes `fullName` in the URL checksum, so a URL signed for one person's
        // name cannot be reused by another.  We generate a generic attendee URL (signed
        // with the attendee password) to store in the booking reference — attendees who
        // receive the confirmation email will use this URL, or the server can generate
        // a personalised URL at join-time using the stored attendeePW.
        const attendeeJoinUrl = getBBBJoinUrl(
          bbbCreds,
          meeting.meetingID,
          "Attendee",
          meeting.attendeePW
        );

        return {
          type: "bigbluebutton_video",
          id: meeting.meetingID,
          // `url` is the link sent to the organizer in booking confirmation emails.
          // We use the moderator join URL here so the organizer (host) automatically
          // has moderator privileges when they join via the confirmation link.
          // Attendees join via a separate attendee join URL (available via the booking
          // reference attendee link or the per-attendee join endpoint).
          url: hostJoinUrl,
          // `password` stores the attendee password in the booking reference.
          // This is used for attendee-facing join flows and is safe to expose
          // to attendees — it does NOT grant moderator privileges.
          // The moderator password is embedded in `url` (the host join URL) and
          // is never exposed in this field.
          password: meeting.attendeePW,
          // Attendee join URL is stored separately so that the booking confirmation
          // page can display the correct link for non-organizer attendees.
          // Note: this is not part of the standard VideoCallData interface; it is
          // handled by the BBB-specific booking page (if present).
          // TODO: once cal.com supports a first-class attendee join URL in
          //   VideoCallData, migrate attendeeJoinUrl there.
          ...(attendeeJoinUrl && { attendeeJoinUrl }),
        } as VideoCallData & { attendeeJoinUrl?: string };
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
