import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";
import { createMeeting, endMeeting, getJoinUrl } from "./bbb";

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = (appKeys.bbb_url as string) || "";
      const bbbSecret = (appKeys.bbb_secret as string) || "";

      const meetingID = uuidv4();
      const meetingName = eventData.title || "Cal.diy Meeting";

      if (!bbbUrl || !bbbSecret) {
        return Promise.resolve({
          type: metadata.type,
          id: meetingID,
          password: "",
          url: "",
        });
      }

      const result = await createMeeting(
        bbbUrl,
        {
          meetingID,
          name: meetingName,
          attendeePW: "attendee",
          moderatorPW: "moderator",
          welcome: "Welcome to the meeting!",
          logoutURL: bbbUrl,
        },
        bbbSecret
      );

      if (result.returncode !== "SUCCESS") {
        throw new Error(`BigBlueButton createMeeting failed: ${result.message ?? "Unknown error"}`);
      }

      const joinUrl = getJoinUrl(bbbUrl, { meetingID, fullName: eventData.organizer.name, password: "moderator" }, bbbSecret);

      return Promise.resolve({
        type: metadata.type,
        id: meetingID,
        password: "attendee",
        url: joinUrl,
      });
    },

    deleteMeeting: async (meetingId: string): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = (appKeys.bbb_url as string) || "";
      const bbbSecret = (appKeys.bbb_secret as string) || "";

      if (!bbbUrl || !bbbSecret) {
        return;
      }

      await endMeeting(bbbUrl, { meetingID: meetingId, password: "moderator" }, bbbSecret);
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
