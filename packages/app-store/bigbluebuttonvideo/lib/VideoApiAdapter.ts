import { createHash } from "crypto";

import { HttpError } from "@calcom/lib/http-error";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

const DEFAULT_BBB_URL = "https://your-bbb-server.example.com/bigbluebutton";

/**
 * Build a BigBlueButton API checksum.
 * checksum = SHA256(apiName + queryString + secret)
 */
function buildChecksum(apiName: string, queryString: string, secret: string): string {
  return createHash("sha256")
    .update(apiName + queryString + secret)
    .digest("hex");
}

/**
 * Build a full BBB API URL with checksum appended.
 */
function buildBBBUrl(
  baseUrl: string,
  apiName: string,
  params: Record<string, string>,
  secret: string
): string {
  const qs = new URLSearchParams(params).toString();
  const checksum = buildChecksum(apiName, qs, secret);
  const sep = qs ? "&" : "";
  return `${baseUrl}/api/${apiName}?${qs}${sep}checksum=${checksum}`;
}

/**
 * Parse a simple XML value: <returncode>SUCCESS</returncode> → "SUCCESS"
 */
function parseXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1] : "";
}

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  const getKeys = async () => {
    const appKeys = await getAppKeysFromSlug(metadata.slug);
    const bbbUrl =
      typeof appKeys.bbb_url === "string" && appKeys.bbb_url ? appKeys.bbb_url : DEFAULT_BBB_URL;
    const bbbSecret =
      typeof appKeys.bbb_secret === "string" && appKeys.bbb_secret ? appKeys.bbb_secret : "";
    if (!bbbSecret) {
      throw new HttpError({
        statusCode: 500,
        message: "BigBlueButton API secret is not configured.",
      });
    }
    return { bbbUrl: bbbUrl.replace(/\/+$/, ""), bbbSecret };
  };

  return {
    getAvailability: () => Promise.resolve([]),

    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const { bbbUrl, bbbSecret } = await getKeys();

      // Use a stable meeting ID derived from the event title + start time
      const meetingID = `cal-${Buffer.from(event.title + event.startTime)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 32)}`;

      // Single password used for both attendee and moderator so Cal's
      // single meetingPassword field covers both roles.
      const password = createHash("sha256")
        .update(meetingID + bbbSecret)
        .digest("hex")
        .slice(0, 16);

      const params: Record<string, string> = {
        name: event.title,
        meetingID,
        attendeePW: password,
        moderatorPW: password,
        record: "false",
        autoStartRecording: "false",
        allowStartStopRecording: "true",
      };

      const createUrl = buildBBBUrl(bbbUrl, "create", params, bbbSecret);

      const response = await fetch(createUrl);
      if (!response.ok) {
        throw new HttpError({
          statusCode: response.status,
          message: `BigBlueButton create failed: ${response.statusText}`,
        });
      }

      const xml = await response.text();
      const returncode = parseXmlValue(xml, "returncode");
      if (returncode !== "SUCCESS") {
        const message = parseXmlValue(xml, "message");
        throw new HttpError({
          statusCode: 500,
          message: `BigBlueButton create error: ${message}`,
        });
      }

      // Build attendee join URL (same URL/password works for both organizer and attendee
      // since we set identical attendeePW and moderatorPW).
      const joinParams: Record<string, string> = {
        fullName: "Guest",
        meetingID,
        password,
        redirect: "true",
      };
      const joinUrl = buildBBBUrl(bbbUrl, "join", joinParams, bbbSecret);

      return {
        type: metadata.type,
        id: meetingID,
        password,
        url: joinUrl,
      };
    },

    deleteMeeting: async (meetingID: string): Promise<void> => {
      const { bbbUrl, bbbSecret } = await getKeys();

      // Retrieve the moderator password stored in the booking reference.
      // For BBB, ending requires the moderator password; we derive it the same way.
      const password = createHash("sha256")
        .update(meetingID + bbbSecret)
        .digest("hex")
        .slice(0, 16);

      const endUrl = buildBBBUrl(bbbUrl, "end", { meetingID, password }, bbbSecret);

      try {
        await fetch(endUrl);
      } catch {
        // Best-effort – meeting may have already ended
      }
    },

    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
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
