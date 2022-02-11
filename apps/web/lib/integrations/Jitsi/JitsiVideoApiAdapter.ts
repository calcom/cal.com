import { v4 as uuidv4 } from "uuid";

import { PartialReference } from "@lib/events/EventManager";
import { VideoApiAdapter, VideoCallData } from "@lib/videoClient";

const JitsiVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (): Promise<VideoCallData> => {
      const meetingID = uuidv4();
      return Promise.resolve({
        type: "jitsi_video",
        id: meetingID,
        password: "",
        url: "https://meet.jit.si/cal/" + meetingID,
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
