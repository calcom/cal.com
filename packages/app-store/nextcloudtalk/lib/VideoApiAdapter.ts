import getAppKeysFromSlug from "_utils/getAppKeysFromSlug";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

const NextcloudTalkApiAdapter = (): VideoApiAdapter => {
  const type = "nextcloudtalk_video";
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(type);

      const meetingPattern = (appKeys.nextcloudTalkPattern as string) || "{uuid}";
      const hostUrl = appKeys.nextcloudTalkHost as string;

      //Allows "/{Type}-with-{Attendees}" slug
      const meetingID = meetingPattern
        .replaceAll("{uuid}", uuidv4())
        .replaceAll("{Title}", eventData.title)
        .replaceAll("{Event Type Title}", eventData.type)
        .replaceAll("{Scheduler}", eventData.attendees.map((a) => a.name).join("-"))
        .replaceAll("{Organizer}", eventData.organizer.name)
        .replaceAll("{Location}", eventData.location || "")
        .replaceAll("{Team}", eventData.team?.name || "")
        .replaceAll(" ", "-"); //Last Rule! - Replace all blanks (%20) with dashes;

      // Create video link with room type 3 (constant for a public room, see https://nextcloud-talk.readthedocs.io/en/stable/constants/#conversation-types)
      const videoLink = await fetch(`${hostUrl}/ocs/v2.php/apps/spreed/api/v4/room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "OCS-APIRequest": true,
        },
        body: {
          roomType: 3,
          roomName: `${meetingID}`,
        },
      });

      const videoLinkData = await videoLink.json();

      return Promise.resolve({
        type: type,
        id: videoLinkData.token,
        password: "",
        url: `${hostUrl}/${videoLinkData.token}}`,
      });
    },
    deleteMeeting: async (): Promise<void> => {
      Promise.resolve();
    },
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: type,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default NextcloudTalkApiAdapter;
