import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const NextcloudTalkVideoApiAdapter = (): VideoApiAdapter => {
  const slug = "nextcloudtalk";
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(slug);

      const meetingPattern = (appKeys.nextcloudTalkPattern as string) || "{uuid}";
      const hostUrl = appKeys.nextcloudTalkHost as string;
      const user = appKeys.nextcloudTalkUser as string;
      const password = appKeys.nextcloudTalkPassword as string;

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
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
          "Content-Type": "application/json",
          "OCS-APIRequest": "true",
        },
        body: JSON.stringify({
          roomType: 3,
          roomName: `${meetingID}`,
        }),
      });

      const videoLinkData = await videoLink.json();

      return Promise.resolve({
        type: slug,
        id: videoLinkData.ocs.data.token,
        password: "",
        url: `${hostUrl}/call/${videoLinkData.ocs.data.token}`,
      });
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(slug);

      const hostUrl = appKeys.nextcloudTalkHost as string;
      const user = appKeys.nextcloudTalkUser as string;
      const password = appKeys.nextcloudTalkPassword as string;

      // Remove video link
      await fetch(`${hostUrl}/ocs/v2.php/apps/spreed/api/v4/room/${uid}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
          "Content-Type": "application/json",
          "OCS-APIRequest": "true",
        },
      });

      return Promise.resolve();
    },
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: slug,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default NextcloudTalkVideoApiAdapter;
