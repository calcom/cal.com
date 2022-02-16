import { Credential } from "@prisma/client";

import { handleErrorsJson } from "@lib/errors";
import { PartialReference } from "@lib/events/EventManager";
import { randomString } from "@lib/random";
import { VideoApiAdapter, VideoCallData } from "@lib/videoClient";

export const FAKE_HUDDLE_CREDENTIAL: Credential = {
  id: +new Date().getTime(),
  type: "huddle01_video",
  key: { apikey: randomString(12) },
  userId: +new Date().getTime(),
};

const Huddle01VideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (): Promise<VideoCallData> => {
      const res = await fetch(
        "https://wpss2zlpb9.execute-api.us-east-1.amazonaws.com/new-meeting?utmCampaign=cal.com&utmSource=partner&utmMedium=calendar"
      );

      const { url } = await handleErrorsJson(res);

      return Promise.resolve({
        type: "huddle01_video",
        id: randomString(21),
        password: "",
        url,
      });
    },
    deleteMeeting: async (): Promise<void> => {
      Promise.resolve();
    },
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: "huddle01_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default Huddle01VideoApiAdapter;
