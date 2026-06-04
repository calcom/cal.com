import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

import { buildApiUrl } from "./bbb";

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = appKeys.bbb_url as string;
      const bbbSecret = appKeys.bbb_secret as string;

      const meetingID = uuidv4();
      const meetingName = eventData.title || "Cal Meeting";
      const attendeePW = uuidv4().slice(0, 8);
      const moderatorPW = uuidv4().slice(0, 8);

      const createUrl = buildApiUrl(
        bbbUrl,
        "create",
        {
          meetingID,
          name: meetingName,
          attendeePW,
          moderatorPW,
          welcome: `<br>Welcome to <b>${meetingName}</b>!`,
        },
        bbbSecret
      );

      const response = await fetch(createUrl);
      if (!response.ok) {
        throw new Error(`Failed to create BBB meeting: ${response.statusText}`);
      }

      const joinUrl = buildApiUrl(
        bbbUrl,
        "join",
        {
          meetingID,
          fullName: eventData.organizer.name,
          password: moderatorPW,
          redirect: "true",
        },
        bbbSecret
      );

      return {
        type: metadata.type,
        id: meetingID,
        password: moderatorPW,
        url: joinUrl,
      };
    },
    deleteMeeting: async (bookingRef: PartialReference): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = appKeys.bbb_url as string;
      const bbbSecret = appKeys.bbb_secret as string;

      const endUrl = buildApiUrl(
        bbbUrl,
        "end",
        {
          meetingID: bookingRef.meetingId as string,
          password: bookingRef.meetingPassword as string,
        },
        bbbSecret
      );

      await fetch(endUrl);
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
