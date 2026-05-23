import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";
import { v4 as uuidv4 } from "uuid";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";
import {
  getBigBlueButtonCreateUrl,
  getBigBlueButtonEndUrl,
  getBigBlueButtonJoinUrl,
  normalizeBigBlueButtonBaseUrl,
  sanitizeMeetingId,
} from "./bbbApi";

const buildMeetingId = (meetingPattern: string, eventData: CalendarEvent): string =>
  sanitizeMeetingId(
    meetingPattern
      .replaceAll("{uuid}", uuidv4())
      .replaceAll("{Title}", eventData.title || "")
      .replaceAll("{Event Type Title}", eventData.type || "")
      .replaceAll("{Scheduler}", eventData.attendees.map((attendee) => attendee.name).join("-"))
      .replaceAll("{Organizer}", eventData.organizer.name || "")
      .replaceAll("{Location}", eventData.location || "")
      .replaceAll("{Team}", eventData.team?.name || "")
  );

const assertBookingReference = (
  bookingRef: PartialReference
): { meetingId: string; meetingPassword: string; meetingUrl: string } => {
  if (!bookingRef.meetingId || !bookingRef.meetingPassword || !bookingRef.meetingUrl) {
    throw new Error("BigBlueButton booking reference is missing meeting data");
  }

  return {
    meetingId: bookingRef.meetingId,
    meetingPassword: bookingRef.meetingPassword,
    meetingUrl: bookingRef.meetingUrl,
  };
};

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const meetingPattern = (appKeys.bigBlueButtonPathPattern as string) || "{uuid}";
      const hostUrl = normalizeBigBlueButtonBaseUrl(appKeys.bigBlueButtonHost as string);
      const sharedSecret = (appKeys.bigBlueButtonSharedSecret as string)?.trim();
      if (!sharedSecret) {
        throw new Error("BigBlueButton shared secret is required");
      }

      const meetingID = buildMeetingId(meetingPattern, eventData);
      const attendeePassword = uuidv4();
      const moderatorPassword = (appKeys.bigBlueButtonModeratorPassword as string)?.trim() || uuidv4();
      const createUrl = getBigBlueButtonCreateUrl({
        baseUrl: hostUrl,
        meetingId: meetingID,
        meetingName: eventData.title,
        attendeePassword,
        moderatorPassword,
        sharedSecret,
      });

      const response = await fetch(createUrl, { method: "POST" });
      const responseBody = await response.text();
      if (!response.ok || !/<returncode>\s*SUCCESS\s*<\/returncode>/i.test(responseBody)) {
        throw new Error("Unable to create BigBlueButton meeting");
      }

      return {
        type: metadata.type,
        id: meetingID,
        password: moderatorPassword,
        url: getBigBlueButtonJoinUrl({
          baseUrl: hostUrl,
          meetingId: meetingID,
          fullName: eventData.organizer.name || "Moderator",
          password: moderatorPassword,
          sharedSecret,
        }),
      };
    },
    deleteMeeting: async (meetingId: string): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const hostUrl = normalizeBigBlueButtonBaseUrl(appKeys.bigBlueButtonHost as string);
      const sharedSecret = (appKeys.bigBlueButtonSharedSecret as string)?.trim();
      const moderatorPassword = (appKeys.bigBlueButtonModeratorPassword as string)?.trim();
      if (!sharedSecret || !moderatorPassword) {
        return Promise.resolve();
      }

      const endUrl = getBigBlueButtonEndUrl({
        baseUrl: hostUrl,
        meetingId,
        moderatorPassword,
        sharedSecret,
      });

      await fetch(endUrl, { method: "POST" });
    },
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      const { meetingId, meetingPassword, meetingUrl } = assertBookingReference(bookingRef);

      return Promise.resolve({
        type: metadata.type,
        id: meetingId,
        password: meetingPassword,
        url: meetingUrl,
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
