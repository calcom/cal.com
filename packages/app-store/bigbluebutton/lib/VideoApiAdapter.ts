import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import metadata from "../_metadata";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton/lib/VideoApiAdapter"] });

const BigBlueButtonAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  return {
    createMeeting: async (e: CalendarEvent): Promise<VideoCallData> => {
      if (!credential.userId) {
        log.error("[BBB] User is not logged in");
        throw new Error("User is not logged in");
      }

      if (!e.uid) {
        log.info("[BBB] No booking UID provided, cannot create meeting");
        throw new Error("We need the booking uid to create the BigBlueButton reference in the DB");
      }

      const url = `${WEBAPP_URL}/api/integrations/bigbluebutton/join?meetingID=${e.uid}`;

      return Promise.resolve({
        type: metadata.type,
        id: e.uid,
        password: "",
        url,
      });
    },
    updateMeeting: async (bookingRef: PartialReference, _e: CalendarEvent): Promise<VideoCallData> => {
      return Promise.resolve({
        type: metadata.type,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
    deleteMeeting: async (): Promise<void> => {
      return Promise.resolve();
    },
    getAvailability: () => {
      return Promise.resolve([]);
    },
  };
};

export default BigBlueButtonAdapter;
