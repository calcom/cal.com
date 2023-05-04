import { v4 as uuidv4 } from "uuid";

import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

const JitsiVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (): Promise<VideoCallData> => {
    //TODO: make this configurable: e.g. `/{Event type}-{Scheduler}-{uuid}`
      const meetingID = uuidv4();
    //TODO: make this configurable via the web interface.
    const hostUrl = process.env.JITSI_HOST_URL || "https://meet.jit.si/cal/";
      return Promise.resolve({
        type: "jitsi_video",
        id: meetingID,
        password: "",
        url: process.env.JITSI_INSTANCE_URL || "https://meet.jit.si/cal/" + meetingID,
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
