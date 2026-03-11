import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { appKeysSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton"] });

// ─── BBB XML Response Types ───────────────────────────────────────────────────

interface BBBBaseResponse {
  returncode: "SUCCESS" | "FAILED";
  messageKey?: string;
  message?: string;
}

interface BBBCreateMeetingResponse extends BBBBaseResponse {
  meetingID: string;
  internalMeetingID: string;
  attendeePW: string;
  moderatorPW: string;
  createTime: number;
  createDate: string;
  hasUserJoined: boolean;
  duration: number;
  hasBeenForciblyEnded: boolean;
  voiceBridge: number;
  dialNumber: string;
  recording: boolean;
}

export interface BBBRecording {
  recordID: string;
  meetingID: string;
  name: string;
  published: string;
  state: "processing" | "processed" | "published" | "unpublished" | "deleted";
  startTime: number;
  endTime: number;
  participants: number;
  playback: {
    format: {
      type: string;
      url: string;
      processingTime: number;
      length: number;
    };
  };
}

// ─── BBB Error Codes ─────────────────────────────────────────────────────────

const BBB_ERROR_MESSAGES: Record<string, string> = {
  checksumError: "BigBlueButton checksum validation failed. Please check your API secret.",
  invalidPassword: "Invalid meeting password provided.",
  meetingNotFound: "Meeting not found on BigBlueButton server.",
  notFound: "Requested resource not found on BigBlueButton server.",
  duplicateWarning: "A meeting with that ID already exists.",
  maxConcurrent: "Maximum concurrent meetings limit reached on the BBB server.",
  noRecordings: "No recordings found for this meeting.",
  invalidMeetingIdentifier: "The meeting ID provided is invalid.",
  notAllowed: "Not allowed to perform this action on the BigBlueButton server.",
};

function getBBBErrorMessage(messageKey?: string): string {
  if (!messageKey) return "An unknown BigBlueButton error occurred.";
  return BBB_ERROR_MESSAGES[messageKey] ?? `BigBlueButton error: ${messageKey}`;
}

// ─── Checksum Helpers ─────────────────────────────────────────────────────────

/**
 * Computes the SHA-256 checksum required by the BigBlueButton API.
 * checksum = SHA256( apiCall + queryString + secret )
 */
export function computeChecksum(apiCall: string, queryString: string, secret: string): string {
  return createHash("sha256")
    .update(apiCall + queryString + secret)
    .digest("hex");
}

/**
 * Builds a signed BBB API URL.
 */
export function buildBBBUrl(
  baseUrl: string,
  apiCall: string,
  params: Record<string, string>,
  secret: string
): string {
  const queryString = new URLSearchParams(params).toString();
  const checksum = computeChecksum(apiCall, queryString, secret);
  return `${baseUrl}${apiCall}?${queryString}&checksum=${checksum}`;
}

// ─── XML Parser ───────────────────────────────────────────────────────────────

/**
 * Extracts the text content of a single XML tag.
 * BBB always returns simple XML, so a regex approach is sufficient and
 * avoids adding a heavy XML parsing dependency.
 */
export function parseXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
}

function parseBBBBaseResponse(xml: string): BBBBaseResponse {
  const returncode = parseXmlValue(xml, "returncode") as "SUCCESS" | "FAILED";
  const messageKey = parseXmlValue(xml, "messageKey") || undefined;
  const message = parseXmlValue(xml, "message") || undefined;

  if (returncode === "FAILED") {
    throw new HttpError({
      statusCode: 502,
      message: getBBBErrorMessage(messageKey),
    });
  }

  return { returncode, messageKey, message };
}

// ─── API Client ───────────────────────────────────────────────────────────────

async function callBBBApi(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/xml" },
  });

  if (!response.ok) {
    throw new HttpError({
      statusCode: response.status,
      message: `BigBlueButton server responded with HTTP ${response.status}: ${response.statusText}`,
    });
  }

  return response.text();
}

// ─── BBB API Functions ────────────────────────────────────────────────────────

/**
 * Checks if a meeting is currently running.
 * Used before creating a meeting to prevent duplicates.
 */
export async function isMeetingRunning(
  baseUrl: string,
  secret: string,
  meetingID: string
): Promise<boolean> {
  const url = buildBBBUrl(baseUrl, "isMeetingRunning", { meetingID }, secret);
  try {
    const xml = await callBBBApi(url);
    const result = parseXmlValue(xml, "running");
    return result === "true";
  } catch {
    // If the check fails, assume meeting is not running
    return false;
  }
}

/**
 * Creates a new BBB meeting and returns the full meeting response.
 */
export async function createBBBMeeting(
  baseUrl: string,
  secret: string,
  params: {
    name: string;
    meetingID: string;
    attendeePW: string;
    moderatorPW: string;
    record: boolean;
    welcome?: string;
    duration?: number;
  }
): Promise<BBBCreateMeetingResponse> {
  const queryParams: Record<string, string> = {
    name: params.name,
    meetingID: params.meetingID,
    attendeePW: params.attendeePW,
    moderatorPW: params.moderatorPW,
    record: params.record ? "true" : "false",
    autoStartRecording: "false",
    allowStartStopRecording: "true",
  };

  if (params.welcome) {
    queryParams.welcome = params.welcome;
  }
  if (params.duration !== undefined) {
    queryParams.duration = String(params.duration);
  }

  const url = buildBBBUrl(baseUrl, "create", queryParams, secret);
  const xml = await callBBBApi(url);
  const base = parseBBBBaseResponse(xml);

  return {
    ...base,
    meetingID: parseXmlValue(xml, "meetingID"),
    internalMeetingID: parseXmlValue(xml, "internalMeetingID"),
    attendeePW: parseXmlValue(xml, "attendeePW"),
    moderatorPW: parseXmlValue(xml, "moderatorPW"),
    createTime: Number(parseXmlValue(xml, "createTime")),
    createDate: parseXmlValue(xml, "createDate"),
    hasUserJoined: parseXmlValue(xml, "hasUserJoined") === "true",
    duration: Number(parseXmlValue(xml, "duration")),
    hasBeenForciblyEnded: parseXmlValue(xml, "hasBeenForciblyEnded") === "true",
    voiceBridge: Number(parseXmlValue(xml, "voiceBridge")),
    dialNumber: parseXmlValue(xml, "dialNumber"),
    recording: parseXmlValue(xml, "recording") === "true",
  };
}

/**
 * Ends a meeting that is currently running.
 */
export async function endBBBMeeting(
  baseUrl: string,
  secret: string,
  meetingID: string,
  moderatorPW: string
): Promise<void> {
  const url = buildBBBUrl(baseUrl, "end", { meetingID, password: moderatorPW }, secret);
  const xml = await callBBBApi(url);
  parseBBBBaseResponse(xml); // throws on FAILED
}

/**
 * Fetches recordings for a meeting.
 */
export async function getBBBRecordings(
  baseUrl: string,
  secret: string,
  meetingID: string
): Promise<BBBRecording[]> {
  const url = buildBBBUrl(baseUrl, "getRecordings", { meetingID }, secret);
  const xml = await callBBBApi(url);
  parseBBBBaseResponse(xml);

  // Parse recording entries
  const recordingMatches = xml.match(/<recording>([\s\S]*?)<\/recording>/g);
  if (!recordingMatches) return [];

  return recordingMatches.map((rec) => ({
    recordID: parseXmlValue(rec, "recordID"),
    meetingID: parseXmlValue(rec, "meetingID"),
    name: parseXmlValue(rec, "name"),
    published: parseXmlValue(rec, "published"),
    state: parseXmlValue(rec, "state") as BBBRecording["state"],
    startTime: Number(parseXmlValue(rec, "startTime")),
    endTime: Number(parseXmlValue(rec, "endTime")),
    participants: Number(parseXmlValue(rec, "participants")),
    playback: {
      format: {
        type: parseXmlValue(rec, "type"),
        url: parseXmlValue(rec, "url"),
        processingTime: Number(parseXmlValue(rec, "processingTime")),
        length: Number(parseXmlValue(rec, "length")),
      },
    },
  }));
}

/**
 * Builds a signed join URL for a participant.
 */
export function buildJoinUrl(
  baseUrl: string,
  secret: string,
  params: {
    meetingID: string;
    fullName: string;
    password: string;
    userID?: string;
    redirect?: boolean;
  }
): string {
  const queryParams: Record<string, string> = {
    meetingID: params.meetingID,
    fullName: params.fullName,
    password: params.password,
    redirect: params.redirect !== false ? "true" : "false",
  };
  if (params.userID) {
    queryParams.userID = params.userID;
  }
  return buildBBBUrl(baseUrl, "join", queryParams, secret);
}

// ─── Password Generator ───────────────────────────────────────────────────────

function generatePassword(length = 16): string {
  return uuidv4().replace(/-/g, "").slice(0, length);
}

// ─── Video API Adapter ────────────────────────────────────────────────────────

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },

    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug("bigbluebutton");
      const parsed = appKeysSchema.safeParse(appKeys);

      if (!parsed.success) {
        throw new HttpError({
          statusCode: 500,
          message: `BigBlueButton is not configured properly: ${parsed.error.message}`,
        });
      }

      const { bigBlueButtonUrl: baseUrl, bigBlueButtonSecret: secret } = parsed.data;

      const meetingID = uuidv4();
      const attendeePW = generatePassword();
      const moderatorPW = generatePassword();

      // Prevent duplicate meetings: check if one is already running
      const alreadyRunning = await isMeetingRunning(baseUrl, secret, meetingID);
      if (alreadyRunning) {
        log.warn("BigBlueButton: meeting already running with this ID — will reuse", { meetingID });
      }

      let meetingResult: BBBCreateMeetingResponse;
      try {
        meetingResult = await createBBBMeeting(baseUrl, secret, {
          name: eventData.title,
          meetingID,
          attendeePW,
          moderatorPW,
          record: true,
        });
      } catch (error) {
        log.error("BigBlueButton: failed to create meeting", { error });
        throw error;
      }

      // Build the moderator join URL — this is the URL the organizer uses
      const moderatorJoinUrl = buildJoinUrl(baseUrl, secret, {
        meetingID: meetingResult.meetingID,
        fullName: eventData.organizer.name,
        password: meetingResult.moderatorPW,
        userID: "organizer",
      });

      // Build attendee join URL — stored in the password field for use in booking details
      const attendeeJoinUrl = buildJoinUrl(baseUrl, secret, {
        meetingID: meetingResult.meetingID,
        fullName: "Guest",
        password: meetingResult.attendeePW,
      });

      log.debug("BigBlueButton: meeting created", {
        meetingID: meetingResult.meetingID,
        recording: meetingResult.recording,
      });

      return {
        type: "bigbluebutton_video",
        id: meetingResult.meetingID,
        password: attendeeJoinUrl,
        url: moderatorJoinUrl,
      };
    },

    deleteMeeting: async (uid: string): Promise<void> => {
      // BBB meetings end automatically when all participants leave.
      // The `end` API requires the moderator password which we don't persist
      // in the current booking reference model. We verify the meeting is no
      // longer running and log accordingly.
      const appKeys = await getAppKeysFromSlug("bigbluebutton");
      const parsed = appKeysSchema.safeParse(appKeys);

      if (!parsed.success) {
        log.warn("BigBlueButton: not configured, skipping deleteMeeting");
        return;
      }

      const { bigBlueButtonUrl: baseUrl, bigBlueButtonSecret: secret } = parsed.data;

      try {
        const running = await isMeetingRunning(baseUrl, secret, uid);
        if (!running) {
          log.debug("BigBlueButton: meeting already ended", { uid });
          return;
        }
        // Meeting is still running but we have no moderatorPW to call end API.
        // BBB meetings auto-close when empty; log a warning.
        log.warn("BigBlueButton: meeting still running but moderatorPW not available to end it", { uid });
      } catch (error) {
        log.error("BigBlueButton: error during deleteMeeting", { error, uid });
      }
    },

    updateMeeting: async (
      bookingRef: PartialReference,
      _eventData: CalendarEvent
    ): Promise<VideoCallData> => {
      // BBB join URLs are signed with a checksum and cannot be naively updated.
      // Re-use the stored URLs from the original booking reference.
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
