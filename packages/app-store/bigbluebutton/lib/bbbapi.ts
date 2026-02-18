import { createHash } from "crypto";

// ─── SSRF Protection ──────────────────────────────────────────────────────────

/**
 * Validates that a URL is safe to fetch as an external server URL.
 * Rejects non-https schemes, private/loopback IP ranges, localhost, and
 * cloud-metadata endpoints (AWS/GCP/Azure) to prevent SSRF attacks.
 *
 * @throws {Error} with a descriptive message if the URL is unsafe.
 */
export function validateExternalUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL: could not be parsed");
  }

  // Only allow HTTPS
  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS URLs are allowed for the BigBlueButton server URL");
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost variants
  if (hostname === "localhost" || hostname === "localhost.") {
    throw new Error("Loopback/localhost URLs are not allowed");
  }

  // Reject cloud metadata endpoints (AWS, GCP, Azure)
  const blockedHostnames = [
    "169.254.169.254", // AWS/GCP/Azure IMDS
    "metadata.google.internal", // GCP
  ];
  if (blockedHostnames.includes(hostname)) {
    throw new Error("Cloud metadata endpoint URLs are not allowed");
  }

  // Reject IPv6 loopback / ULA
  // Strip brackets from IPv6 addresses (e.g. [::1] → ::1)
  const ipv6Bare = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;

  // Normalise a potential IPv6 address for comparison
  const isIPv6Loopback = ipv6Bare === "::1";
  if (isIPv6Loopback) {
    throw new Error("Loopback/localhost URLs are not allowed");
  }

  // Reject ULA (fc00::/7) — matches fc** and fd**
  if (/^f[cd][0-9a-f]{2}:/i.test(ipv6Bare)) {
    throw new Error("Private/internal network URLs are not allowed");
  }

  // Reject private IPv4 ranges via regex (avoids DNS — hostname-only check)
  const privateRanges = [
    /^127\./, // 127.0.0.0/8  — loopback
    /^10\./, // 10.0.0.0/8   — RFC 1918
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 — RFC 1918
    /^192\.168\./, // 192.168.0.0/16 — RFC 1918
    /^169\.254\./, // 169.254.0.0/16 — link-local / APIPA
  ];
  for (const range of privateRanges) {
    if (range.test(hostname)) {
      throw new Error("Private/internal network URLs are not allowed");
    }
  }
}

export type ChecksumAlgorithm = "sha1" | "sha256" | "sha384" | "sha512";

export interface BBBCredentials {
  serverUrl: string;
  sharedSecret: string;
  checksumAlgorithm?: ChecksumAlgorithm;
}

export interface BBBCreateParams {
  name: string;
  meetingID: string;
  attendeePW: string;
  moderatorPW: string;
  record?: boolean;
  maxParticipants?: number;
  logoutURL?: string;
}

export interface BBBCreateResponse {
  returncode: string;
  meetingID: string;
  internalMeetingID: string;
  parentMeetingID: string;
  attendeePW: string;
  moderatorPW: string;
  createTime: number;
  voiceBridge: number;
  dialNumber: string;
  createDate: string;
  hasUserJoined: boolean;
  duration: number;
  hasBeenForciblyEnded: boolean;
  messageKey?: string;
  message?: string;
}

export interface BBBVersionResponse {
  returncode: string;
  version: string;
  apiVersion: string;
}

/**
 * Computes the BBB API checksum for a given API call name and query string.
 * Per the BigBlueButton API docs: checksum = hash(apiName + queryString + sharedSecret)
 */
export function computeChecksum(
  apiName: string,
  queryString: string,
  sharedSecret: string,
  algorithm: ChecksumAlgorithm = "sha256"
): string {
  return createHash(algorithm)
    .update(apiName + queryString + sharedSecret)
    .digest("hex");
}

/**
 * Builds a query string from a params object, omitting undefined/null values.
 * Does NOT include the checksum — that is appended after.
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join("&");
}

/**
 * Builds a full BBB API URL with checksum for the given API call.
 */
export function buildBBBUrl(
  credentials: BBBCredentials,
  apiName: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const baseUrl = credentials.serverUrl.replace(/\/+$/, "");
  const algorithm = credentials.checksumAlgorithm ?? "sha256";
  const queryString = buildQueryString(params);
  const checksum = computeChecksum(apiName, queryString, credentials.sharedSecret, algorithm);
  const separator = queryString ? "&" : "";
  return `${baseUrl}/api/${apiName}?${queryString}${separator}checksum=${checksum}`;
}

/**
 * Parses the XML response from BBB API into a plain object.
 * BBB always returns XML; we do a minimal parse without a heavy library.
 */
export function parseXmlResponse(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tagRe = /<([^/>\s][^>]*)>([^<]*)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(xml)) !== null) {
    result[match[1]] = match[2].trim();
  }
  return result;
}

/**
 * Calls a BBB API endpoint and returns the parsed response.
 * Throws if the returncode is not "SUCCESS".
 */
export async function callBBBApi(
  credentials: BBBCredentials,
  apiName: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<Record<string, string>> {
  // SSRF protection: validate before any network request
  validateExternalUrl(credentials.serverUrl);
  const url = buildBBBUrl(credentials, apiName, params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BBB API request failed: HTTP ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const parsed = parseXmlResponse(text);
  if (parsed.returncode !== "SUCCESS") {
    throw new Error(
      `BBB API error (${apiName}): ${parsed.messageKey ?? "UNKNOWN"} — ${parsed.message ?? "No message"}`
    );
  }
  return parsed;
}

/**
 * Validates that the BBB server is reachable and returns API version >= 2.0.
 */
export async function validateBBBServer(
  credentials: BBBCredentials
): Promise<{ version: string; apiVersion: string }> {
  // SSRF protection: validate before any network request
  validateExternalUrl(credentials.serverUrl);
  const baseUrl = credentials.serverUrl.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/api`);
  if (!response.ok) {
    throw new Error(`Cannot reach BBB server: HTTP ${response.status}`);
  }
  const text = await response.text();
  const parsed = parseXmlResponse(text);
  if (parsed.returncode !== "SUCCESS") {
    throw new Error("BBB server returned an error response on /api");
  }
  const apiVersion = parsed.apiVersion ?? parsed.version ?? "0";
  const major = parseFloat(apiVersion);
  if (isNaN(major) || major < 2.0) {
    throw new Error(`BigBlueButton API version ${apiVersion} is not supported. Requires 2.0+`);
  }
  return { version: parsed.version ?? apiVersion, apiVersion };
}

/**
 * Creates a BBB meeting. Returns the meeting credentials (attendee PW and moderator PW).
 */
export async function createBBBMeeting(
  credentials: BBBCredentials,
  params: BBBCreateParams
): Promise<{ meetingID: string; attendeePW: string; moderatorPW: string }> {
  const result = await callBBBApi(credentials, "create", {
    name: params.name,
    meetingID: params.meetingID,
    attendeePW: params.attendeePW,
    moderatorPW: params.moderatorPW,
    record: params.record ?? false,
    ...(params.maxParticipants !== undefined && { maxParticipants: params.maxParticipants }),
    ...(params.logoutURL && { logoutURL: params.logoutURL }),
  });
  return {
    meetingID: result.meetingID ?? params.meetingID,
    attendeePW: result.attendeePW ?? params.attendeePW,
    moderatorPW: result.moderatorPW ?? params.moderatorPW,
  };
}

/**
 * Generates a BBB join URL for an attendee (non-moderator role).
 */
export function getBBBJoinUrl(
  credentials: BBBCredentials,
  meetingID: string,
  fullName: string,
  password: string,
  extra?: Record<string, string>
): string {
  return buildBBBUrl(credentials, "join", {
    fullName,
    meetingID,
    password,
    redirect: "true",
    ...extra,
  });
}

/**
 * Ends a BBB meeting using the moderator password.
 */
export async function endBBBMeeting(
  credentials: BBBCredentials,
  meetingID: string,
  moderatorPW: string
): Promise<void> {
  await callBBBApi(credentials, "end", {
    meetingID,
    password: moderatorPW,
  });
}
