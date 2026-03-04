import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

import { HttpError } from "@calcom/lib/http-error";
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

      const serverUrl = (appKeys.bigBlueButtonServerUrl as string)?.replace(/\/$/, "");
      const secret = (appKeys.bigBlueButtonSecret as string) || "";

      // Validate required credentials
      if (!serverUrl || !secret) {
        throw new HttpError({
          statusCode: 400,
          message: "BigBlueButton server URL and secret are required. Please configure them in app settings.",
        });
      }

      const cleanServerUrl = serverUrl.replace(/\/$/, "");

      // Generate meeting ID
      const meetingID = `cal-${uuidv4()}`;
      
      // Generate moderator password
      const moderatorPassword = crypto.randomBytes(8).toString("hex");

      // Build query string for create API (without secret)
      const createParams = {
        name: encodeURIComponent(eventData.title),
        meetingID: meetingID,
        password: moderatorPassword,
      };

      const queryString = `name=${createParams.name}&meetingID=${createParams.meetingID}&password=${createParams.password}`;
      
      // BBB checksum: SHA1(method + queryString + secret)
      const checksumData = `create${queryString}${secret}`;
      const checksum = crypto.createHash("sha1").update(checksumData).digest("hex");
      
      const createUrl = `${cleanServerUrl}/api/create?${queryString}&checksum=${checksum}`;

      // Actually create the meeting via BBB API
      try {
        const createResponse = await fetch(createUrl, { method: "GET" });
        if (!createResponse.ok) {
          throw new Error(`Failed to create BBB meeting: ${createResponse.status} ${createResponse.statusText}`);
        }
        // Note: BBB returns XML, but we don't need to parse it for now
        // The important part is that the meeting was created successfully
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new HttpError({
          statusCode: 500,
          message: `Failed to create BigBlueButton meeting: ${errorMessage}`,
        });
      }

      // Build join URL with correct checksum (endpoint-specific)
      const joinParams = {
        meetingID: meetingID,
        password: moderatorPassword,
        fullName: encodeURIComponent(eventData.organizer.name),
      };

      const joinQueryString = `meetingID=${joinParams.meetingID}&password=${joinParams.password}&fullName=${joinParams.fullName}`;
      const joinChecksumData = `join${joinQueryString}${secret}`;
      const joinChecksum = crypto.createHash("sha1").update(joinChecksumData).digest("hex");
      
      const joinUrl = `${cleanServerUrl}/api/join?${joinQueryString}&checksum=${joinChecksum}`;

      return Promise.resolve({
        type: metadata.type,
        id: meetingID,
        password: moderatorPassword,
        url: joinUrl,
      });
    },
    deleteMeeting: async (bookingRef: PartialReference): Promise<void> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);

      const serverUrl = (appKeys.bigBlueButtonServerUrl as string)?.replace(/\/$/, "");
      const secret = (appKeys.bigBlueButtonSecret as string) || "";

      // Validate credentials
      if (!serverUrl || !secret) {
        console.warn("BigBlueButton credentials not configured, skipping meeting deletion");
        return;
      }

      const cleanServerUrl = serverUrl.replace(/\/$/, "");
      const meetingID = bookingRef.meetingId as string;
      const moderatorPassword = bookingRef.meetingPassword as string || "";

      // Build end API call with required password parameter
      const endParams = {
        meetingID: meetingID,
        password: moderatorPassword,
      };

      const endQueryString = `meetingID=${endParams.meetingID}&password=${endParams.password}`;
      
      // BBB checksum: SHA1(method + queryString + secret)
      const endChecksumData = `end${endQueryString}${secret}`;
      const endChecksum = crypto.createHash("sha1").update(endChecksumData).digest("hex");
      
      const endUrl = `${cleanServerUrl}/api/end?${endQueryString}&checksum=${endChecksum}`;

      try {
        const endResponse = await fetch(endUrl, { method: "GET" });
        
        // Check if the request was successful at HTTP level
        if (!endResponse.ok) {
          console.warn(`BBB end API returned status ${endResponse.status}`);
          return;
        }

        // Note: BBB returns XML response
        // A proper implementation would parse the XML and check returnCode
        // For now, we assume success if HTTP status is 200
      } catch (error) {
        // Log generic error message without exposing sensitive details
        const errorType = error instanceof Error ? error.constructor.name : "Unknown error";
        console.warn(`BigBlueButton meeting deletion failed: ${errorType}`);
        // Don't throw - meeting deletion failure shouldn't block booking cancellation
      }
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
