import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton"] });

/**
 * Compute the BigBlueButton API checksum.
 *
 * checksum = SHA256( apiCallName + queryString + sharedSecret )
 *
 * @see https://docs.bigbluebutton.org/development/api/#api-security-model
 */
function getChecksum(apiCallName: string, queryString: string, sharedSecret: string): string {
  const data = `${apiCallName}${queryString}${sharedSecret}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Build a full BigBlueButton API URL with checksum.
 */
function buildApiUrl(
  baseUrl: string,
  apiCallName: string,
  params: Record<string, string>,
  sharedSecret: string
): string {
  const query = new URLSearchParams(params).toString();
  const checksum = getChecksum(apiCallName, query, sharedSecret);
  // Ensure the base URL does not have a trailing slash
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}/api/${apiCallName}?${query}&checksum=${checksum}`;
}

/**
 * Parse a simple XML response from BBB.
 * We do minimal parsing to avoid adding heavy XML deps – the BBB responses
 * we care about are small and well-structured.
 */
function getXmlTagValue(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(re);
  return match ? match[1] : null;
}

const BigBlueButtonApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const serverUrl = appKeys.url as string | undefined;
      const sharedSecret = appKeys.salt as string | undefined;

      if (!serverUrl || !sharedSecret) {
        throw new Error(
          "BigBlueButton server URL and shared secret must be configured. " +
            "Please set them in the BigBlueButton app settings."
        );
      }

      const meetingID = uuidv4();
      const meetingName = eventData.title || "Cal.com Meeting";
      const attendeePW = uuidv4().slice(0, 8);
      const moderatorPW = uuidv4().slice(0, 8);

      const createParams: Record<string, string> = {
        name: meetingName,
        meetingID,
        attendeePW,
        moderatorPW,
        welcome: `Welcome to ${meetingName}`,
        // Auto-end the meeting 5 minutes after the last user leaves
        logoutURL: "https://cal.com",
      };

      const createUrl = buildApiUrl(serverUrl, "create", createParams, sharedSecret);

      log.debug("Creating BBB meeting", { meetingID, meetingName });

      try {
        const response = await fetch(createUrl);
        const xml = await response.text();

        const returnCode = getXmlTagValue(xml, "returncode");
        if (returnCode !== "SUCCESS") {
          const message = getXmlTagValue(xml, "message") || "Unknown error";
          const messageKey = getXmlTagValue(xml, "messageKey");
          log.error("BBB create meeting failed", { returnCode, messageKey, message });
          throw new Error(`BigBlueButton create meeting failed: ${message}`);
        }

        // Build a join URL for the moderator (organizer)
        const joinParams: Record<string, string> = {
          meetingID,
          fullName: eventData.organizer.name || "Organizer",
          role: "MODERATOR",
        };
        const joinUrl = buildApiUrl(serverUrl, "join", joinParams, sharedSecret);

        return {
          type: metadata.type,
          id: meetingID,
          password: moderatorPW,
          url: joinUrl,
        };
      } catch (error) {
        log.error("Error creating BigBlueButton meeting", { error });
        throw error;
      }
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      try {
        const appKeys = await getAppKeysFromSlug(metadata.slug);
        const serverUrl = appKeys.url as string | undefined;
        const sharedSecret = appKeys.salt as string | undefined;

        if (!serverUrl || !sharedSecret) {
          log.warn("BigBlueButton credentials not configured, skipping meeting deletion");
          return;
        }

        // BBB uses the "end" API to terminate a meeting
        const endParams: Record<string, string> = {
          meetingID: uid,
        };
        const endUrl = buildApiUrl(serverUrl, "end", endParams, sharedSecret);

        const response = await fetch(endUrl);
        const xml = await response.text();
        const returnCode = getXmlTagValue(xml, "returncode");

        if (returnCode !== "SUCCESS") {
          const messageKey = getXmlTagValue(xml, "messageKey");
          // "notFound" means the meeting already ended - that's fine
          if (messageKey !== "notFound") {
            const message = getXmlTagValue(xml, "message");
            log.error("BBB end meeting failed", { returnCode, messageKey, message });
          }
        }
      } catch (error) {
        log.error("Error ending BigBlueButton meeting", { error });
      }
    },

    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      // BBB doesn't support updating a meeting, so return the existing data
      return Promise.resolve({
        type: metadata.type,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default BigBlueButtonApiAdapter;
