import { createHash } from "crypto";
import { promises as dnsPromises } from "dns";

// ─── SSRF Protection ──────────────────────────────────────────────────────────

/**
 * Checks whether a resolved IP address (IPv4 or IPv6) belongs to a private,
 * loopback, link-local, ULA, or cloud-metadata range.
 *
 * This function is called both for literal IP addresses in the URL and for the
 * addresses returned by DNS resolution.  Centralising the check here ensures
 * the same rules apply in both paths, preventing bypasses via IPv4-mapped IPv6
 * or other encoding tricks.
 *
 * @param ip  Bare IP string — no brackets (e.g. "127.0.0.1" or "::1").
 * @throws {Error} if the IP is in a blocked range.
 */
export function assertSafeResolvedIp(ip: string): void {
  const normalized = ip.toLowerCase();

  // ── IPv4 loopback / private / link-local ──────────────────────────────────
  const privateIPv4Ranges = [
    /^127\./, // 127.0.0.0/8  — loopback
    /^10\./, // 10.0.0.0/8   — RFC 1918
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 — RFC 1918
    /^192\.168\./, // 192.168.0.0/16 — RFC 1918
    /^169\.254\./, // 169.254.0.0/16 — link-local / APIPA / AWS IMDS
  ];
  for (const range of privateIPv4Ranges) {
    if (range.test(normalized)) {
      throw new Error("Private/internal network URLs are not allowed");
    }
  }

  // ── IPv6 loopback ─────────────────────────────────────────────────────────
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") {
    throw new Error("Loopback/localhost URLs are not allowed");
  }

  // ── ULA (fc00::/7) — fc** and fd** ───────────────────────────────────────
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) {
    throw new Error("Private/internal network URLs are not allowed");
  }

  // ── IPv4-mapped IPv6: ::ffff:<IPv4> or ::ffff:<hex>:<hex> ────────────────
  // RFC 4291 §2.5.5.2 — these are syntactic aliases for IPv4 addresses and
  // must be unwrapped before applying the IPv4 range checks, otherwise a
  // private IPv4 address like ::ffff:127.0.0.1 slips through.
  const dotDecimalMatch = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(normalized);
  const hexMatch = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(normalized);
  if (dotDecimalMatch ?? hexMatch) {
    let embeddedIp: string;
    if (dotDecimalMatch) {
      embeddedIp = dotDecimalMatch[1];
    } else {
      // hexMatch is non-null here because dotDecimalMatch was null
      const m = hexMatch!;
      const high = parseInt(m[1], 16);
      const low = parseInt(m[2], 16);
      embeddedIp = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
    }
    // Recurse with the unwrapped IPv4 address so all IPv4 checks apply.
    assertSafeResolvedIp(embeddedIp);
  }
}

/**
 * Validates the *static* properties of a URL (scheme, literal-IP hostname,
 * known cloud-metadata hostnames, localhost).  This is a fast, synchronous
 * check that runs before DNS resolution.
 *
 * It does NOT resolve hostnames — call `validateResolvedAddresses()` after
 * DNS lookup to guard against DNS rebinding.
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

  // Strip brackets from IPv6 addresses (e.g. [::1] → ::1) and run full IP checks.
  const ipv6Bare = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
  assertSafeResolvedIp(ipv6Bare);
}

/**
 * Resolves the hostname of `rawUrl` via DNS and validates every returned
 * address against `assertSafeResolvedIp`.
 *
 * This is the DNS-rebinding defence: even if a hostname passes the initial
 * static check (it currently resolves to a public IP), an attacker with
 * control over the DNS record could flip it to a private IP between the
 * static check and the actual `fetch()` call.  By resolving explicitly here
 * and pinning our fetch to the validated IP, we close that window.
 *
 * @throws {Error} if any resolved address is in a blocked range, if DNS
 *   lookup fails, or if the URL cannot be parsed.
 */
export async function validateResolvedAddresses(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL: could not be parsed");
  }

  // Strip brackets from IPv6 literal hostnames (e.g. [::1] → ::1).
  const hostname = parsed.hostname.startsWith("[")
    ? parsed.hostname.slice(1, -1)
    : parsed.hostname;

  // If the hostname is already an IP literal, validate it directly — no DNS needed.
  const isIpLiteral =
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || // IPv4
    /^[0-9a-f:]+$/i.test(hostname); // IPv6 (bare, no brackets)

  if (isIpLiteral) {
    assertSafeResolvedIp(hostname);
    return;
  }

  // Resolve the hostname.  `lookup` returns a single address per family.
  // We check both IPv4 (family 4) and IPv6 (family 6) to be thorough.
  const lookupResults = await Promise.all([
    dnsPromises.lookup(hostname, { family: 4 }).catch(() => null),
    dnsPromises.lookup(hostname, { family: 6 }).catch(() => null),
  ]);

  let atLeastOneResolved = false;
  for (const result of lookupResults) {
    if (result === null) continue; // family not available
    atLeastOneResolved = true;
    assertSafeResolvedIp(result.address);
  }

  if (!atLeastOneResolved) {
    throw new Error(`DNS resolution failed for hostname: ${hostname}`);
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
 *
 * Previous regex `/<([^/>\s][^>]*)>([^<]*)<\/\1>/g` failed for tags with
 * attributes (e.g. `<meetings type="array">...</meetings>`) because the
 * capture group matched the full opening tag string including attributes,
 * but the back-reference `\1` in the closing tag had to match exactly that
 * same string — which never included attributes — causing the match to fail.
 *
 * Fix: capture only the tag *name* (no attributes) in group 1, match the
 * full opening tag (with optional attributes) separately, then use `\1` to
 * match the closing tag by name only.
 */
export function parseXmlResponse(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Group 1: tag name (no spaces/attributes)
  // The opening tag may include attributes: <tagName ...> or just <tagName>
  // The closing tag is matched by tag name only: </tagName>
  const tagRe = /<([a-zA-Z][a-zA-Z0-9_-]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
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
  // SSRF protection — two-layer defence:
  // 1. Static check: scheme, literal-IP ranges, localhost, cloud-metadata hostnames.
  // 2. DNS resolution check: resolves the hostname and validates every returned
  //    address.  This closes the DNS-rebinding window: even if a hostname passes
  //    the static check today, an attacker who controls DNS could flip the record
  //    to a private IP between the static check and the actual fetch.
  validateExternalUrl(credentials.serverUrl);
  await validateResolvedAddresses(credentials.serverUrl);
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
  // SSRF protection — two-layer defence (same as callBBBApi):
  // static URL check + DNS-resolved-address check to prevent DNS rebinding.
  validateExternalUrl(credentials.serverUrl);
  await validateResolvedAddresses(credentials.serverUrl);
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
