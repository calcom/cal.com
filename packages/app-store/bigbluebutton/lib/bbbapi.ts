import { createHash } from "crypto";
import { promises as dnsPromises } from "dns";
import * as https from "https";

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
    /^0\./, // 0.0.0.0/8    — "this" network (unroutable, SSRF risk)
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

  // ── IPv6 link-local (fe80::/10) ───────────────────────────────────────────
  // fe80:: through febf:: are link-local addresses and must never be routable
  // on the public internet — an SSRF that reaches a link-local address can
  // access host-local services (e.g. cloud metadata APIs on some providers).
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) {
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
 * Resolves ALL addresses for the hostname of `rawUrl` via DNS and validates
 * every one against `assertSafeResolvedIp`.
 *
 * Uses `resolve4`/`resolve6` (which return all records for a name) rather than
 * `lookup` (which returns only one record per family).  Checking every address
 * prevents an attacker from serving a mix of public + private IPs and having the
 * single-record check land on the public one.
 *
 * Returns the first validated safe IP address (IPv4 preferred) for use when
 * pinning the subsequent fetch to avoid DNS rebinding.
 *
 * @throws {Error} if any resolved address is in a blocked range, if DNS
 *   lookup fails, or if the URL cannot be parsed.
 */
export async function resolveAndValidateAddresses(rawUrl: string): Promise<string> {
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
  //
  // IPv6 detection: a bare IPv6 address MUST contain at least one colon — without
  // a colon the string is just a hex hostname (e.g. "deadbeef", "cafe1234") that
  // must go through DNS resolution like any other hostname.  The previous regex
  // `/^[0-9a-f:]+$/i` matched hex-only hostnames as "IPv6", causing them to skip
  // DNS validation entirely and reach `assertSafeResolvedIp` unchecked.
  const isIpLiteral =
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || // IPv4 dotted-decimal
    /^[0-9a-f]*:[0-9a-f:]*$/i.test(hostname); // IPv6 bare — must contain ≥1 colon

  if (isIpLiteral) {
    assertSafeResolvedIp(hostname);
    return hostname;
  }

  // Resolve ALL addresses for the hostname using resolve4/resolve6 so that
  // every record is checked — not just one per family (as lookup() returns).
  // An attacker who controls DNS could return a mix of public + private IPs;
  // checking only one record would let a private IP slip through.
  const [ipv4Addresses, ipv6Addresses] = await Promise.all([
    dnsPromises.resolve4(hostname).catch((): string[] => []),
    dnsPromises.resolve6(hostname).catch((): string[] => []),
  ]);

  const allAddresses = [...ipv4Addresses, ...ipv6Addresses];
  if (allAddresses.length === 0) {
    throw new Error(`DNS resolution failed for hostname: ${hostname}`);
  }

  // Validate every resolved address — reject if any is in a private range.
  for (const ip of allAddresses) {
    assertSafeResolvedIp(ip);
  }

  // Return the first validated address (IPv4 preferred for wider compatibility).
  // The caller pins the fetch to this IP to prevent DNS rebinding.
  return ipv4Addresses.length > 0 ? ipv4Addresses[0] : ipv6Addresses[0];
}

/**
 * @deprecated Use `resolveAndValidateAddresses` instead, which returns a pinned
 * IP for DNS-rebinding-safe fetch and checks ALL DNS records.
 */
export async function validateResolvedAddresses(rawUrl: string): Promise<void> {
  await resolveAndValidateAddresses(rawUrl);
}

/**
 * Builds a URL that targets a specific IP address rather than the hostname,
 * replacing the host component while preserving path, query string, and port.
 *
 * This is used to pin the HTTP fetch to the IP we validated via DNS, preventing
 * the OS from re-resolving the hostname at request time (DNS rebinding attack).
 *
 * The original `Host` header must be set to the original hostname so that TLS
 * SNI and virtual-hosting on the BBB server continue to work correctly.
 *
 * @param rawUrl    The original URL (e.g. "https://bbb.example.com/api/create?...")
 * @param pinnedIp  The pre-validated IP to use as the host (e.g. "1.2.3.4")
 * @returns         The rewritten URL with host replaced by pinnedIp
 */
export function buildPinnedUrl(rawUrl: string, pinnedIp: string): string {
  const parsed = new URL(rawUrl);
  // IPv6 addresses must be wrapped in brackets in URLs.
  const hostPart = pinnedIp.includes(":") ? `[${pinnedIp}]` : pinnedIp;
  const portPart = parsed.port ? `:${parsed.port}` : "";
  parsed.host = `${hostPart}${portPart}`;
  return parsed.toString();
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
 * Fetches `url` with SSRF protection using Node.js `https.request`.
 *
 * SSRF defence strategy (three layers):
 * 1. Static check (`validateExternalUrl`): rejects bad scheme, literal private
 *    IPs, localhost, cloud-metadata hostnames — fast and synchronous.
 * 2. DNS pre-resolution (`resolveAndValidateAddresses`): resolves ALL A/AAAA
 *    records for the hostname (not just one per family) and validates each one.
 *    Returns the first validated safe IP address.
 * 3. Pinned request: the actual HTTPS connection is made to the pre-validated
 *    IP address (`host` option), while `servername` is set to the original
 *    hostname so TLS SNI and certificate validation use the correct domain name.
 *    This closes the DNS-rebinding window: even if an attacker flips DNS to a
 *    private IP after our validation, the socket connects to the pinned IP.
 *
 * Why `https.request` instead of `fetch`:
 *   Node.js `fetch` (undici) ignores the `Host` header override for TLS SNI —
 *   the SNI extension is always derived from the URL's hostname, not the header.
 *   When the URL hostname is replaced by a raw IP for DNS-pinning, SNI sends the
 *   IP string, which does not match the BBB server's TLS certificate (issued for
 *   the domain name).  `https.request` exposes the `servername` option which
 *   explicitly controls TLS SNI independently of the connection target — this is
 *   the only Node.js API that supports DNS-pinned + SNI-correct HTTPS requests.
 *
 * DoS protection:
 * - Timeout: 30-second limit for the entire request (connection + response).
 *   Prevents hanging indefinitely on slow/unresponsive servers.
 * - Response size limit: 10 MB maximum. BBB API responses are XML and should be
 *   small (<100 KB typically). A 10 MB cap prevents memory exhaustion attacks
 *   from malicious servers sending infinite response bodies.
 *
 * @param rawUrl   The URL to fetch (original hostname form).
 */
async function safeFetch(rawUrl: string): Promise<{ ok: boolean; status: number; statusText: string; text: () => Promise<string> }> {
  validateExternalUrl(rawUrl);
  const pinnedIp = await resolveAndValidateAddresses(rawUrl);

  const parsed = new URL(rawUrl);
  const originalHostname = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : 443;
  const path = parsed.pathname + parsed.search;

  // Build the Host header value: hostname + port (if non-default for HTTPS).
  // The Host header must include the port when it differs from the default
  // (443 for HTTPS), otherwise virtual-host routing and some reverse proxies
  // may fail to route the request correctly.
  const hostHeader = parsed.port ? `${originalHostname}:${parsed.port}` : originalHostname;

  // Timeout: 30 seconds for the entire request (connection + data transfer).
  const TIMEOUT_MS = 30_000;
  // Max response size: 10 MB. BBB API responses are small XML documents; this
  // cap prevents memory exhaustion from malicious/misconfigured servers.
  const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        // Connect to the pre-validated IP — not the hostname — to pin the socket
        // and prevent the OS from re-resolving (and potentially swapping) the address.
        host: pinnedIp,
        port,
        path,
        method: "GET",
        // Set overall request timeout (covers connection + response).
        timeout: TIMEOUT_MS,
        // servername controls TLS SNI independently of `host`.
        // The BBB server presents a certificate for its domain name; SNI must
        // send that domain name so the server selects the correct certificate.
        servername: originalHostname,
        // Set the Host header so the BBB server's virtual-host routing picks the
        // correct vhost (same reason as servername, but at HTTP layer).
        // Include the port if present to ensure correct routing.
        headers: { Host: hostHeader },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let totalSize = 0;

        res.on("data", (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > MAX_RESPONSE_SIZE) {
            // Abort the request and reject with a clear error.
            req.destroy();
            reject(new Error(`Response size exceeded limit of ${MAX_RESPONSE_SIZE} bytes`));
            return;
          }
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve({
            ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            text: () => Promise.resolve(body),
          });
        });
      }
    );

    // Timeout handler: fires if the request takes longer than TIMEOUT_MS.
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TIMEOUT_MS}ms`));
    });

    req.on("error", reject);
    req.end();
  });
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
  const url = buildBBBUrl(credentials, apiName, params);
  // safeFetch validates + resolves + pins the IP to close the DNS-rebinding window.
  const response = await safeFetch(url);
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
  const baseUrl = credentials.serverUrl.replace(/\/+$/, "");
  // safeFetch provides full SSRF protection (static check + all-records DNS + pinned IP).
  const response = await safeFetch(`${baseUrl}/api`);
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
