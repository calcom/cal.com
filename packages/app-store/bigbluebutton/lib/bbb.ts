import { createHash } from "node:crypto";

/**
 * Helpers for talking to a BigBlueButton server.
 *
 * BBB authenticates each API request with a SHA-1 checksum computed from
 * `<callName><queryString><sharedSecret>`. See:
 * https://docs.bigbluebutton.org/development/api/#api-security-model
 */

export type BbbConfig = {
  url: string;
  secret: string;
};

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");
}

export function computeChecksum(callName: string, queryString: string, sharedSecret: string): string {
  return createHash("sha1").update(`${callName}${queryString}${sharedSecret}`).digest("hex");
}

export function buildApiUrl(
  config: BbbConfig,
  callName: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const baseUrl = config.url.replace(/\/$/, "");
  const queryString = buildQueryString(params);
  const checksum = computeChecksum(callName, queryString, config.secret);
  const separator = queryString.length > 0 ? "&" : "";
  return `${baseUrl}/api/${callName}?${queryString}${separator}checksum=${checksum}`;
}
