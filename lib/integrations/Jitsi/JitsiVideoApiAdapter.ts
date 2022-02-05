import { v4 as uuidv4 } from "uuid";

import { VideoApiAdapter, VideoCallData } from "@lib/videoClient";

const JitsiVideoApiAdapter = (): VideoApiAdapter => {
  return {
    createMeeting: async (): Promise<VideoCallData> => {
      const meetingID = uuidv4();
      return Promise.resolve({
        type: "jitsi_video",
        id: meetingID,
        password: "",
        url: "https://meet.jit.si/cal/LwX3btM3zFyrrYshsy44fyG8bGQLiVPejGSDBMJLFSlAx7wzRP",
      });
    },
  };
};

export default JitsiVideoApiAdapter;
