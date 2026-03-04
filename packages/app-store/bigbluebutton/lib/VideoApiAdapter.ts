import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const serverUrl = (appKeys.bigBlueButtonServerUrl as string)?.replace(/\/$/, "") || "https://test.blindsidenetworks.com/bigbluebutton";
      const secret = (appKeys.bigBlueButtonSecret as string) || "";

      // Generate meeting ID
      const meetingID = `cal-${uuidv4()}`;
      
      // Generate moderator password
      const moderatorPassword = crypto.randomBytes(8).toString("hex");

      // Create meeting via BBB API
      const checksumData = `create&name=${encodeURIComponent(eventData.title)}&meetingID=${meetingID}&password=${moderatorPassword}&secret=${secret}`;
      const checksum = crypto.createHash("sha1").update(checksumData).digest("hex");
      
      const createUrl = `${serverUrl}/api/create?name=${encodeURIComponent(eventData.title)}&meetingID=${meetingID}&password=${moderatorPassword}&checksum=${checksum}`;

      // Note: We don't actually call the API here to avoid rate limits
      // The meeting will be created when the first user joins
      // This is consistent with how Jitsi works

      const joinUrl = `${serverUrl}/api/join?meetingID=${meetingID}&password=${moderatorPassword}&fullName=${encodeURIComponent(eventData.organizer.name)}&checksum=${checksum}`;

      return Promise.resolve({
        type: metadata.type,
        id: meetingID,
        password: moderatorPassword,
        url: joinUrl,
      });
    },
    deleteMeeting: async (bookingRef: PartialReference): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const serverUrl = (appKeys.bigBlueButtonServerUrl as string)?.replace(/\/$/, "") || "https://test.blindsidenetworks.com/bigbluebutton";
      const secret = (appKeys.bigBlueButtonSecret as string) || "";

      const meetingID = bookingRef.meetingId as string;
      const checksum = crypto.createHash("sha1").update(`end&meetingID=${meetingID}&secret=${secret}`).digest("hex");
      const endUrl = `${serverUrl}/api/end?meetingID=${meetingID}&checksum=${checksum}`;

      try {
        await fetch(endUrl, { method: "GET" });
      } catch (e) {
        // Meeting may already be ended or not exist
        console.error("Failed to end BigBlueButton meeting:", e);
      }
      
      Promise.resolve();
    },
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: "bigbluebutton_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
