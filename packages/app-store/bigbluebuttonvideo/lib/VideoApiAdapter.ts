import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const meetingPattern = (appKeys.bigBlueButtonPathPattern as string) || "{uuid}";
      const hostUrl = trimTrailingSlash(
        (appKeys.bigBlueButtonHost as string) || "https://test-install.blindsidenetworks.com/bigbluebutton"
      );

      const meetingID = meetingPattern
        .replaceAll("{uuid}", uuidv4())
        .replaceAll("{Title}", eventData.title)
        .replaceAll("{Event Type Title}", eventData.type)
        .replaceAll("{Scheduler}", eventData.attendees.map((attendee) => attendee.name).join("-"))
        .replaceAll("{Organizer}", eventData.organizer.name)
        .replaceAll("{Location}", eventData.location || "")
        .replaceAll("{Team}", eventData.team?.name || "")
        .replaceAll(" ", "-");

      return Promise.resolve({
        type: metadata.type,
        id: meetingID,
        password: "",
        url: `${hostUrl}/${encodeURIComponent(meetingID)}`,
      });
    },
    deleteMeeting: async (): Promise<void> => {
      Promise.resolve();
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
