import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";
import appConfig from "../config.json";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton/lib/VideoApiAdapter"] });

const BigBlueButtonAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  return {
    createMeeting: async (e: CalendarEvent): Promise<VideoCallData> => {
      if (!credential.userId) {
        log.error("[BBB] User is not logged in");
        throw new ErrorWithCode(ErrorCode.Unauthorized, "User is not logged in");
      }

      if (!e.uid) {
        log.info("[BBB] No booking UID provided, cannot create meeting");
        throw new ErrorWithCode(
          ErrorCode.BadRequest,
          "We need the booking uid to create the BigBlueButton reference in the DB"
        );
      }

      const url = `${WEBAPP_URL}/api/integrations/bigbluebutton/join?meetingID=${encodeURIComponent(e.uid)}`;

      return Promise.resolve({
        type: appConfig.type,
        id: e.uid,
        password: "",
        url,
      });
    },
    updateMeeting: async (bookingRef: PartialReference, e: CalendarEvent): Promise<VideoCallData> => {
      if (!credential.userId) {
        log.error("[BBB] User is not logged in");
        throw new ErrorWithCode(ErrorCode.Unauthorized, "User is not logged in");
      }

      if (!e.uid) {
        log.info("[BBB] No booking UID provided, cannot update meeting");
        throw new ErrorWithCode(
          ErrorCode.BadRequest,
          "We need the booking uid to create the BigBlueButton reference in the DB"
        );
      }

      const url = `${WEBAPP_URL}/api/integrations/bigbluebutton/join?meetingID=${encodeURIComponent(e.uid)}`;

      return Promise.resolve({
        type: bookingRef.type || appConfig.type,
        id: e.uid,
        password: bookingRef.meetingPassword || "",
        url,
      });
    },

    // BigBlueButton meetings are created on-demand during join, so no cleanup is needed.
    deleteMeeting: async (_uid: string) => {
      await Promise.resolve();
    },
    getAvailability: async () => {
      return Promise.resolve([]);
    },
  };
};

export default BigBlueButtonAdapter;
