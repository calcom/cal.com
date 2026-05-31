import { createHash } from "node:crypto";

export function buildQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

export function computeChecksum(callName: string, queryString: string, sharedSecret: string): string {
  return createHash("sha1")
    .update(callName + queryString + sharedSecret)
    .digest("hex");
}

export function buildApiUrl(
  baseUrl: string,
  callName: string,
  params: Record<string, string>,
  sharedSecret: string
): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const queryString = buildQueryString(params);
  const checksum = computeChecksum(callName, queryString, sharedSecret);
  const separator = queryString ? "&" : "";
  return `${normalizedBase}/bigbluebutton/api/${callName}?${queryString}${separator}checksum=${checksum}`;
}

export async function createMeeting(
  baseUrl: string,
  params: Record<string, string>,
  sharedSecret: string
): Promise<{ returncode: string; meetingID: string; message?: string }> {
  const url = buildApiUrl(baseUrl, "create", params, sharedSecret);
  const response = await fetch(url);
  const text = await response.text();

  const returncodeMatch = text.match(/<returncode>(\w+)<\/returncode>/);
  const messageMatch = text.match(/<message>([^<]*)<\/message>/);
  const meetingID = params.meetingID;

  return {
    returncode: returncodeMatch?.[1] ?? "FAILED",
    meetingID,
    message: messageMatch?.[1],
  };
}

export function getJoinUrl(
  baseUrl: string,
  params: Record<string, string>,
  sharedSecret: string
): string {
  return buildApiUrl(baseUrl, "join", { ...params, redirect: "true" }, sharedSecret);
}

export async function endMeeting(
  baseUrl: string,
  params: Record<string, string>,
  sharedSecret: string
): Promise<{ returncode: string; message?: string }> {
  const url = buildApiUrl(baseUrl, "end", params, sharedSecret);
  const response = await fetch(url);
  const text = await response.text();

  const returncodeMatch = text.match(/<returncode>(\w+)<\/returncode>/);
  const messageMatch = text.match(/<message>([^<]*)<\/message>/);

  return {
    returncode: returncodeMatch?.[1] ?? "FAILED",
    message: messageMatch?.[1],
  };
}
