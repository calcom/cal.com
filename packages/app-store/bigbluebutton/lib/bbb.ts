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

export function buildQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

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
