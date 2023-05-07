import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const JitsiVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (event): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug("jitsivideo");

      //Default Values
      let meetingID = uuidv4();
      let hostUrl = "https://meet.jit.si/cal/";

      if (typeof appKeys.jitsi_host === "string") hostUrl = appKeys.jitsi_host;
      if (typeof appKeys.jitsi_slug_pattern === "string") {
        meetingID = generateEventSlug(appKeys.jitsi_slug_pattern, event);
      }
      return Promise.resolve({
        type: "jitsi_video",
        id: meetingID,
        password: "",
        url: hostUrl + meetingID,
      });
    },
    deleteMeeting: async (): Promise<void> => {
      Promise.resolve();
    },
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: "jitsi_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

function generateEventSlug(pattern: string, event: CalendarEvent): string {
  pattern
    .replaceAll("{Event type}", event.type)
    .replaceAll("{Title}", event.title)
    .replaceAll("{Location}", event.location!)
    .replaceAll("{Scheduler}", event.attendees.map((a) => a.name).join(", "))
    .replaceAll("{Organiser}", event.organizer.name)
    .replaceAll("{Uuid}", uuidv4());

  return encodeURI(pattern);
}

export default JitsiVideoApiAdapter;
