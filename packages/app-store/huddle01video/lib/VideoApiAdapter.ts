import z from "zod";

import { handleErrorsJson } from "@calcom/lib/errors";
import { randomString } from "@calcom/lib/random";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

const huddle01Schema = z.object({ url: z.string().url(), roomId: z.string() });

const Huddle01VideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (): Promise<VideoCallData> => {
      const res = await fetch(
        "https://wpss2zlpb9.execute-api.us-east-1.amazonaws.com/new-meeting?utmCampaign=cal.com&utmSource=partner&utmMedium=calendar"
      );

      const json = await handleErrorsJson<{ url: string }>(res);
      const { url } = huddle01Schema.parse(json);
      if (url) {
        return Promise.resolve({
          type: "huddle01_video",
          id: randomString(21),
          password: "",
          url,
        });
      }
      return Promise.reject("Url was not received in response body.");
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
