import { v4 as uuidv4 } from "uuid";

import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

const JitsiVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (): Promise<VideoCallData> => {
      //TODO: make this configurable: e.g. `/{Event type}-{Scheduler}-{uuid}`
      const meetingID = uuidv4();
      const appKeys = await getAppKeysFromSlug("jitsivideo");

      let hostUrl = "https://meet.jit.si/cal/";
      if (typeof appKeys.jitsi_host === "string") hostUrl = appKeys.jitsi_host;

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

export default JitsiVideoApiAdapter;
