import crypto from "node:crypto";
import { appKeysSchema } from "../zod";

function buildChecksum(apiCall: string, params: string, sharedSecret: string): string {
  // BBB API requires SHA-1 (not SHA-256)
  return crypto
    .createHash("sha1")
    .update(apiCall + params + sharedSecret)
    .digest("hex");
}

function buildApiUrl(serverUrl: string, apiCall: string, params: string, sharedSecret: string): string {
  const checksum = buildChecksum(apiCall, params, sharedSecret);
  const base = serverUrl.replace(/\/$/, "");
  return `${base}/api/${apiCall}?${params}&checksum=${checksum}`;
}

async function callBbbApi(
  serverUrl: string,
  sharedSecret: string,
  apiCall: string,
  params: Record<string, string>
): Promise<string> {
  const queryString = new URLSearchParams(params).toString();
  const url = buildApiUrl(serverUrl, apiCall, queryString, sharedSecret);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BBB API request failed with status ${response.status}`);
  }
  return response.text();
}

function extractXmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  if (match) {
    return match[1];
  }
  return null;
}

export async function createMeeting(
  serverUrl: string,
  sharedSecret: string,
  meetingId: string,
  meetingName: string
): Promise<BbbMeetingPasswords> {
  const moderatorPW = crypto.randomBytes(8).toString("hex");
  const attendeePW = crypto.randomBytes(8).toString("hex");

  const params = {
    meetingID: meetingId,
    name: meetingName,
    moderatorPW,
    attendeePW,
    autoStartRecording: "false",
    allowStartStopRecording: "true",
  };

  const xml = await callBbbApi(serverUrl, sharedSecret, "create", params);
  const returncode = extractXmlValue(xml, "returncode");

  if (returncode !== "SUCCESS") {
    const message = extractXmlValue(xml, "message") ?? "Unknown BBB error";
    throw new Error(`BBB create meeting failed: ${message}`);
  }

  return { moderatorPW, attendeePW };
}

export function buildJoinUrl(
  serverUrl: string,
  sharedSecret: string,
  meetingId: string,
  password: string,
  displayName: string,
  role: "moderator" | "attendee"
): string {
  let roleValue: string;
  if (role === "moderator") {
    roleValue = "MODERATOR";
  } else {
    roleValue = "VIEWER";
  }

  const params = {
    meetingID: meetingId,
    password,
    fullName: displayName,
    role: roleValue,
  };
  const queryString = new URLSearchParams(params).toString();
  return buildApiUrl(serverUrl, "join", queryString, sharedSecret);
}

export async function endMeeting(
  serverUrl: string,
  sharedSecret: string,
  meetingId: string,
  moderatorPW: string
): Promise<void> {
  const params = { meetingID: meetingId, password: moderatorPW };
  const xml = await callBbbApi(serverUrl, sharedSecret, "end", params);
  const returncode = extractXmlValue(xml, "returncode");

  // "NOT_FOUND" is acceptable — meeting may have already ended
  if (returncode !== "SUCCESS" && returncode !== "NOT_FOUND") {
    const message = extractXmlValue(xml, "message") ?? "Unknown BBB error";
    throw new Error(`BBB end meeting failed: ${message}`);
  }
}

/**
 * Validates BBB server credentials by calling getMeetings.
 * BBB returns FAILED returncode (not HTTP error) when the shared secret is wrong,
 * so checking HTTP 200 alone is insufficient.
 */
export async function validateCredentials(serverUrl: string, sharedSecret: string): Promise<void> {
  const xml = await callBbbApi(serverUrl, sharedSecret, "getMeetings", {});
  const returncode = extractXmlValue(xml, "returncode");

  if (returncode !== "SUCCESS") {
    const message = extractXmlValue(xml, "message") ?? "Invalid BBB credentials";
    throw new Error(message);
  }
}

export async function getAppKeys(slug: string): Promise<{ serverUrl: string; sharedSecret: string }> {
  const { default: getAppKeysFromSlug } = await import("../../_utils/getAppKeysFromSlug");
  const raw = await getAppKeysFromSlug(slug);
  return appKeysSchema.parse(raw);
}

export type BbbMeetingPasswords = {
  moderatorPW: string;
  attendeePW: string;
};
