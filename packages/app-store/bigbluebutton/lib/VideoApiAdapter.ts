import { WEBAPP_URL } from "@calcom/lib/constants";
import type { VideoApiAdapterFactory } from "@calcom/types/VideoApiAdapter";

import appConfig from "../config.json";

const BbbApiAdapter: VideoApiAdapterFactory = () => {
  return {
    createMeeting: async (event) => {
      return {
        type: appConfig.type,
        id: event.uid,
        password: "",
        url: `${WEBAPP_URL}/booking/${event.uid}/join/{ATTENDEE_HASH}`,
      };
    },
    updateMeeting: async (bookingRef, event) => {
      return {
        type: bookingRef.type as string,
        id: event.uid,
        password: bookingRef.meetingPassword as string,
        url: `${WEBAPP_URL}/booking/${event.uid}/join/{ATTENDEE_HASH}`,
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    deleteMeeting: async (): Promise<void> => {},
    getAvailability: async () => [],
  };
};

export default BbbApiAdapter;
