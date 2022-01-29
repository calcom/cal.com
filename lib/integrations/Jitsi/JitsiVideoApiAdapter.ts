import { VideoApiAdapter, VideoCallData } from "@lib/videoClient";

import { CalendarEvent } from "../calendar/interfaces/Calendar";

const JitsiVideoApiAdapter = (): VideoApiAdapter => {
  return {
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      return Promise.resolve({
        type: "jitsi_video",
        id: "udb7p84HW98xHIeQZOAoCjhJSofUh9X3pVmO1YvaOhGuUEBiiL",
        password: "",
        url: "https://meet.jit.si/cal/LwX3btM3zFyrrYshsy44fyG8bGQLiVPejGSDBMJLFSlAx7wzRP",
      });
    },
  };
};

export default JitsiVideoApiAdapter;
