import { createHash } from "node:crypto";

import { XMLParser } from "fast-xml-parser";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import config from "../config.json";

type BigBlueButtonCreateResponse = {
  response?: {
    returncode?: string;
    meetingID?: string;
    moderatorPW?: string;
    messageKey?: string;
    message?: string;
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

const sanitizeServerUrl = (serverUrl: string) => serverUrl.trim().replace(/\/+$/, "");

const buildChecksum = (callName: string, queryString: string, secret: string) => {
  return createHash("sha256").update(`${callName}${queryString}${secret}`).digest("hex");
};

const buildApiUrl = ({
  serverUrl,
  callName,
  params,
  secret,
}: {
  serverUrl: string;
  callName: string;
  params: URLSearchParams;
  secret: string;
}) => {
  const queryString = params.toString();
  const checksum = buildChecksum(callName, queryString, secret);
  return `${sanitizeServerUrl(serverUrl)}/api/${callName}?${queryString}&checksum=${checksum}`;
};

const normalizeMeetingName = (eventData: CalendarEvent) => {
  return (eventData.title || eventData.type || "Cal.com Meeting").trim();
};

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => Promise.resolve([]),
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(config.slug);
      const serverUrl = sanitizeServerUrl(String(appKeys.serverUrl || ""));
      const secret = String(appKeys.secret || "").trim();

      if (!serverUrl) {
        throw new Error("BigBlueButton server URL is missing");
      }

      if (!/^https?:\/\//i.test(serverUrl)) {
        throw new Error("BigBlueButton server URL must start with http:// or https://");
      }

      if (!secret) {
        throw new Error("BigBlueButton secret is missing");
      }

      const meetingID = eventData.uid || uuidv4();
      const moderatorPW = uuidv4();
      const attendeePW = uuidv4();
      const createParams = new URLSearchParams({
        name: normalizeMeetingName(eventData),
        meetingID,
        attendeePW,
        moderatorPW,
      });

      const createUrl = buildApiUrl({
        serverUrl,
        callName: "create",
        params: createParams,
        secret,
      });

      const response = await fetch(createUrl, {
        method: "GET",
        headers: {
          Accept: "application/xml, text/xml;q=0.9, */*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`BigBlueButton createMeeting failed with status ${response.status}`);
      }

      const xml = await response.text();
      const parsed = parser.parse(xml) as BigBlueButtonCreateResponse;
      const result = parsed.response;

      if (!result || result.returncode !== "SUCCESS") {
        throw new Error(result?.message || result?.messageKey || "BigBlueButton meeting creation failed");
      }

      const joinParams = new URLSearchParams({
        fullName: eventData.organizer.name || "Organizer",
        meetingID: result.meetingID || meetingID,
        password: result.moderatorPW || moderatorPW,
      });

      const joinUrl = buildApiUrl({
        serverUrl,
        callName: "join",
        params: joinParams,
        secret,
      });

      return {
        type: config.type,
        id: result.meetingID || meetingID,
        password: result.moderatorPW || moderatorPW,
        url: joinUrl,
      };
    },
    deleteMeeting: async (): Promise<void> => Promise.resolve(),
    updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> => {
      return Promise.resolve({
        type: config.type,
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      });
    },
  };
};

export default BigBlueButtonVideoApiAdapter;
