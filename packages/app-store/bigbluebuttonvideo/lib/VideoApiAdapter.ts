import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

const createBBBChecksum = (apiName: string, params: URLSearchParams, secret: string): string => {
  const queryString = params.toString();
  return crypto.createHash("sha256").update(apiName + queryString + secret).digest("hex");
};

const buildJoinUrl = (serverUrl: string, meetingId: string, password: string, fullName: string, secret: string): string => {
  const params = new URLSearchParams({
    meetingID: meetingId,
    password,
    fullName,
    redirect: "true",
  });
  const checksum = createBBBChecksum("join", params, secret);
  params.append("checksum", checksum);
  return `${serverUrl}/bigbluebutton/api/join?${params.toString()}`;
};

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => Promise.resolve([]),

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const serverUrl = (appKeys.bbbServerUrl as string)?.replace(/\/$/, "");
      const secret = appKeys.bbbSecret as string;

      if (!serverUrl || !secret) {
        throw new Error("BigBlueButton server URL and secret must be configured");
      }

      const meetingId = uuidv4();
      const attendeePW = uuidv4().substring(0, 12);
      const moderatorPW = uuidv4().substring(0, 12);

      const params = new URLSearchParams({
        name: eventData.title,
        meetingID: meetingId,
        attendeePW,
        moderatorPW,
        record: "false",
        autoStartRecording: "false",
        allowStartStopRecording: "true",
        welcome: `<br>Welcome to <b>${eventData.title}</b>!`,
      });

      const checksum = createBBBChecksum("create", params, secret);
      params.append("checksum", checksum);

      const createUrl = `${serverUrl}/bigbluebutton/api/create?${params.toString()}`;
      const response = await fetch(createUrl);
      if (!response.ok) {
        throw new Error(`BigBlueButton API error: ${response.status} ${response.statusText}`);
      }

      const organizerName = eventData.organizer.name || "Organizer";
      const moderatorJoinUrl = buildJoinUrl(serverUrl, meetingId, moderatorPW, organizerName, secret);

      // Encode meetingId and moderatorPW in id field for use in deleteMeeting
      const encodedId = `${meetingId}|${moderatorPW}`;

      return {
        type: metadata.type,
        id: encodedId,
        password: attendeePW,
        url: moderatorJoinUrl,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      try {
        const appKeys = await getAppKeysFromSlug(metadata.slug);
        const serverUrl = (appKeys.bbbServerUrl as string)?.replace(/\/$/, "");
        const secret = appKeys.bbbSecret as string;

        if (!serverUrl || !secret) return;

        // Decode meetingId and moderatorPW from uid
        const [meetingId, moderatorPW] = uid.split("|");
        if (!meetingId || !moderatorPW) return;

        const params = new URLSearchParams({
          meetingID: meetingId,
          password: moderatorPW,
        });
        const checksum = createBBBChecksum("end", params, secret);
        params.append("checksum", checksum);

        await fetch(`${serverUrl}/bigbluebutton/api/end?${params.toString()}`);
      } catch {
        // Meeting may have already ended — silently continue
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
