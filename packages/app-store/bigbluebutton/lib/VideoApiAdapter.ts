import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";
import { v4 as uuidv4 } from "uuid";
import { metadata } from "../_metadata";
import { type BbbMeetingPasswords, buildJoinUrl, createMeeting, endMeeting, getAppKeys } from "./bbb-api";

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const { serverUrl, sharedSecret } = await getAppKeys(metadata.slug);
      const meetingId = uuidv4();
      const meetingName = eventData.title;

      const { moderatorPW, attendeePW } = await createMeeting(
        serverUrl,
        sharedSecret,
        meetingId,
        meetingName
      );

      // Build attendee join URL as the canonical meeting URL.
      // Attendees join with the attendee password — they never receive the moderator URL.
      const organizerName = eventData.organizer.name ?? "Organizer";
      const attendeeJoinUrl = buildJoinUrl(
        serverUrl,
        sharedSecret,
        meetingId,
        attendeePW,
        organizerName,
        "attendee"
      );

      // Store moderatorPW and attendeePW so deleteMeeting can end the room.
      // sharedSecret is intentionally NOT stored here to avoid leaking it through meeting metadata.
      const passwords: BbbMeetingPasswords = { moderatorPW, attendeePW };

      return {
        type: metadata.type,
        id: meetingId,
        password: JSON.stringify(passwords),
        url: attendeeJoinUrl,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const { serverUrl, sharedSecret } = await getAppKeys(metadata.slug);

      // Retrieve the meeting password stored on the BookingReference
      const ref = await prisma.bookingReference.findFirst({
        select: { meetingPassword: true },
        where: { meetingId: uid, type: metadata.type },
      });

      if (!ref?.meetingPassword) return;

      let passwords: BbbMeetingPasswords;
      try {
        passwords = JSON.parse(ref.meetingPassword) as BbbMeetingPasswords;
      } catch {
        // meetingPassword is not valid JSON — meeting cannot be ended gracefully
        return;
      }

      await endMeeting(serverUrl, sharedSecret, uid, passwords.moderatorPW);
    },

    updateMeeting: (_bookingRef: PartialReference, _event: CalendarEvent): Promise<VideoCallData> => {
      // BBB meetings are created per-booking and cannot be updated.
      // Return existing reference data so the booking keeps its URL.
      return Promise.resolve({
        type: metadata.type,
        id: _bookingRef.meetingId as string,
        password: _bookingRef.meetingPassword as string,
        url: _bookingRef.meetingUrl as string,
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
