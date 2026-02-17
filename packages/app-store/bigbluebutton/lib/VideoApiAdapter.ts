import crypto from "crypto";

import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";
import { appKeysSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["[bigbluebutton]"] });

/** @link https://docs.bigbluebutton.org/development/api#api-security-model */
function generateChecksum(apiCall: string, queryString: string, secret: string): string {
  return crypto.createHash("sha256").update(`${apiCall}${queryString}${secret}`).digest("hex");
}

function buildApiUrl(
  baseUrl: string,
  apiCall: string,
  params: Record<string, string>,
  secret: string
): string {
  const queryString = new URLSearchParams(params).toString();
  const checksum = generateChecksum(apiCall, queryString, secret);
  const normalizedUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedUrl}/bigbluebutton/api/${apiCall}?${queryString}&checksum=${checksum}`;
}

async function getAppKeys() {
  const appKeys = await getAppKeysFromSlug(metadata.slug);
  return appKeysSchema.parse(appKeys);
}

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const { bbbUrl, bbbSecret } = await getAppKeys();

      const meetingId = crypto.randomUUID();
      const attendeePW = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      const moderatorPW = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

      const createParams: Record<string, string> = {
        name: eventData.title,
        meetingID: meetingId,
        attendeePW,
        moderatorPW,
        welcome: `Welcome to ${eventData.title}`,
      };

      const createUrl = buildApiUrl(bbbUrl, "create", createParams, bbbSecret);

      try {
        const response = await fetch(createUrl);
        const responseText = await response.text();

        if (!response.ok || responseText.includes("<returncode>FAILED</returncode>")) {
          log.error("BigBlueButton create meeting failed", { responseText });
          throw new Error("Failed to create BigBlueButton meeting");
        }
      } catch (error) {
        log.error("BigBlueButton create meeting error", { error });
        throw error;
      }

      const organizerName = eventData.organizer.name || "Organizer";
      const joinParams: Record<string, string> = {
        meetingID: meetingId,
        fullName: organizerName,
        password: moderatorPW,
        role: "MODERATOR",
      };
      const joinUrl = buildApiUrl(bbbUrl, "join", joinParams, bbbSecret);

      return {
        type: metadata.type,
        id: meetingId,
        password: moderatorPW,
        url: joinUrl,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      try {
        const { bbbUrl, bbbSecret } = await getAppKeys();
        const endParams: Record<string, string> = {
          meetingID: uid,
        };
        const endUrl = buildApiUrl(bbbUrl, "end", endParams, bbbSecret);
        await fetch(endUrl);
      } catch (error) {
        // BBB meetings auto-terminate when all participants leave,
        // so failing to end explicitly is not critical
        log.warn("BigBlueButton end meeting failed (meeting may have already ended)", { error });
      }
    },

    updateMeeting: (bookingRef: PartialReference, _event: CalendarEvent): Promise<VideoCallData> => {
      return Promise.resolve({
        type: metadata.type,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
