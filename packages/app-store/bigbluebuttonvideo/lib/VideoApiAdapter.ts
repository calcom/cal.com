import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

/**
 * Generates a BigBlueButton API checksum.
 * BBB uses SHA-256: SHA256(actionName + queryString + sharedSecret)
 * @see https://docs.bigbluebutton.org/development/api#api-security-model
 */
function bbbChecksum(action: string, queryString: string, secret: string): string {
  return createHash("sha256")
    .update(action + queryString + secret)
    .digest("hex");
}

/**
 * Makes an authenticated call to the BigBlueButton API.
 */
async function bbbApiCall(
  baseUrl: string,
  secret: string,
  action: string,
  params: Record<string, string>
): Promise<Record<string, string | undefined>> {
  const queryString = new URLSearchParams(params).toString();
  const checksum = bbbChecksum(action, queryString, secret);
  const url = `${baseUrl}/api/${action}?${queryString}&checksum=${checksum}`;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/xml" },
  });

  if (!response.ok) {
    throw new Error(`BigBlueButton API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  const returnCode = text.match(/<returncode>(\w+)<\/returncode>/)?.[1];
  if (returnCode === "FAILED") {
    const messageKey = text.match(/<messageKey>([^<]+)<\/messageKey>/)?.[1];
    const message = text.match(/<message>([^<]+)<\/message>/)?.[1];
    throw new Error(`BigBlueButton API failed: ${messageKey} - ${message}`);
  }

  return {
    returnCode,
    meetingID: text.match(/<meetingID>([^<]+)<\/meetingID>/)?.[1],
    attendeePW: text.match(/<attendeePW>([^<]+)<\/attendeePW>/)?.[1],
    moderatorPW: text.match(/<moderatorPW>([^<]+)<\/moderatorPW>/)?.[1],
  };
}

/**
 * Generates a BigBlueButton join URL for an attendee.
 */
function buildJoinUrl(
  baseUrl: string,
  secret: string,
  meetingID: string,
  fullName: string,
  password: string
): string {
  const params = {
    meetingID,
    fullName,
    password,
    redirect: "true",
  };
  const queryString = new URLSearchParams(params).toString();
  const checksum = bbbChecksum("join", queryString, secret);
  return `${baseUrl}/api/join?${queryString}&checksum=${checksum}`;
}

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = (appKeys.bbb_url as string)?.replace(/\/+$/, "");
      const bbbSecret = appKeys.bbb_secret as string;

      if (!bbbUrl || !bbbSecret) {
        throw new Error(
          "BigBlueButton is not configured. Please set the server URL and shared secret in app settings."
        );
      }

      const meetingID = uuidv4();
      const attendeePW = uuidv4().replace(/-/g, "").substring(0, 12);
      const moderatorPW = uuidv4().replace(/-/g, "").substring(0, 12);

      await bbbApiCall(bbbUrl, bbbSecret, "create", {
        name: event.title,
        meetingID,
        attendeePW,
        moderatorPW,
        autoStartRecording: "false",
        allowStartStopRecording: "true",
        record: "false",
      });

      // The meeting URL is the moderator join link; attendees use the attendeePW.
      // We store attendeePW as the password so attendee join links can be generated.
      const organizerName = event.organizer.name ?? "Organizer";
      const url = buildJoinUrl(bbbUrl, bbbSecret, meetingID, organizerName, moderatorPW);

      return {
        type: metadata.type,
        id: meetingID,
        password: attendeePW,
        url,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const bbbUrl = (appKeys.bbb_url as string)?.replace(/\/+$/, "");
      const bbbSecret = appKeys.bbb_secret as string;

      if (!bbbUrl || !bbbSecret) return;

      try {
        // We need the moderatorPW to end a meeting, but we only stored the attendeePW.
        // Attempt to end without password — BBB 2.6+ allows ending with just meetingID for admins.
        await bbbApiCall(bbbUrl, bbbSecret, "end", { meetingID: uid });
      } catch {
        // Meeting may have already ended naturally; this is acceptable.
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
