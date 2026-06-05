import { createHash } from "node:crypto";

/**
 * Build a BigBlueButton API query string with the correct checksum.
 *
 * BBB uses SHA-1 shared-secret checksums per:
 * https://docs.bigbluebutton.org/development/api/#api-security-model
 */

export function computeChecksum(callName: string, queryString: string, secret: string): string {
  const data = callName + queryString + secret;
  return createHash("sha1").update(data).digest("hex");
}

/**
 * Encode an object of key-value pairs into a URL query string.
 * Keys and values are URI-encoded; entries with empty or undefined values are omitted.
 */
export function buildQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

/**
 * Construct a fully authenticated BigBlueButton API URL.
 * Builds the query string, computes the SHA-1 checksum, and returns
 * the complete URL ready for a GET request to the BBB server.
 */
export function buildApiUrl(
  bbbUrl: string,
  callName: string,
  params: Record<string, string>,
  secret: string
): string {
  const qs = buildQueryString(params);
  const checksum = computeChecksum(callName, qs, secret);
  const baseUrl = bbbUrl.replace(/\/+$/, "");
  return `${baseUrl}/api/${callName}?${qs}&checksum=${checksum}`;
}
