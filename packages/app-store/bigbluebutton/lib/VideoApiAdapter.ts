import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

/**
 * Computes a SHA-256 checksum per the BBB API spec.
 * BBB >= 2.6.9 uses SHA-256 by default, but older versions may use SHA-1.
 * We use SHA-256 for better security and forward-compat.
 */
function bbbChecksum(apiCall: string, queryString: string, secret: string): string {
  return crypto
    .createHash("sha256")
    .update(apiCall + queryString + secret)
    .digest("hex");
}

function buildQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function resolveApiBase(bbbUrl: string): string {
  const trimmed = bbbUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) return trimmed + "/";
  if (trimmed.endsWith("/bigbluebutton")) return trimmed + "/api/";
  return trimmed + "/bigbluebutton/api/";
}

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const bbbUrl = appKeys.bbbUrl as string | undefined;
      const bbbSecret = appKeys.bbbSecret as string | undefined;

      if (!bbbUrl || !bbbSecret) {
        throw new Error(
          "BigBlueButton URL and secret must be configured. Check your app settings under Admin > Apps."
        );
      }

      const apiBase = resolveApiBase(bbbUrl);
      const meetingID = uuidv4();
      const meetingName = eventData.title || "Cal.com Meeting";
      const attendeePW = uuidv4().slice(0, 12);
      const moderatorPW = uuidv4().slice(0, 12);

      const createParams: Record<string, string> = {
        name: meetingName,
        meetingID,
        attendeePW,
        moderatorPW,
        welcome: `Welcome to ${meetingName}`,
        record: "false",
        autoStartRecording: "false",
        allowStartStopRecording: "true",
        maxInactivityTimeoutMinutes: "10",
      };

      const qs = buildQuery(createParams);
      const checksum = bbbChecksum("create", qs, bbbSecret);
      const createUrl = `${apiBase}create?${qs}&checksum=${checksum}`;

      const response = await fetch(createUrl);
      if (!response.ok) {
        throw new Error(`BigBlueButton create API returned ${response.status}: ${response.statusText}`);
      }

      const body = await response.text();
      if (!body.includes("<returncode>SUCCESS</returncode>")) {
        const msgMatch = body.match(/<message>(.*?)<\/message>/);
        throw new Error(`BigBlueButton API error: ${msgMatch?.[1] ?? "unknown error"}`);
      }

      // Build a join link using attendee password so the URL works for anyone.
      // The organizer gets the moderator password stored in the booking reference.
      const joinParams: Record<string, string> = {
        meetingID,
        password: attendeePW,
        redirect: "true",
      };
      const joinQs = buildQuery(joinParams);
      const joinChecksum = bbbChecksum("join", joinQs, bbbSecret);
      const joinUrl = `${apiBase}join?${joinQs}&checksum=${joinChecksum}`;

      return {
        type: metadata.type,
        id: meetingID,
        password: moderatorPW,
        url: joinUrl,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      try {
        const appKeys = await getAppKeysFromSlug(metadata.slug);
        const bbbUrl = appKeys.bbbUrl as string | undefined;
        const bbbSecret = appKeys.bbbSecret as string | undefined;

        if (!bbbUrl || !bbbSecret) return;

        const apiBase = resolveApiBase(bbbUrl);
        const endParams: Record<string, string> = { meetingID: uid, password: "" };
        const qs = buildQuery(endParams);
        const checksum = bbbChecksum("end", qs, bbbSecret);

        await fetch(`${apiBase}end?${qs}&checksum=${checksum}`);
      } catch {
        // Meeting may have already ended — that's fine
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
