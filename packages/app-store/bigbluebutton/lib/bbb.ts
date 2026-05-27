import { createHash } from "crypto";

/**
 * Build a query string from an object of parameters, sorted alphabetically by key.
 * BigBlueButton requires parameters to be sorted for checksum computation.
 */
export function buildQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");
}

/**
 * Compute the SHA-1 checksum per the BigBlueButton API security model.
 * checksum = sha1(callName + queryString + sharedSecret)
 */
export function computeChecksum(callName: string, queryString: string, sharedSecret: string): string {
  return createHash("sha1")
    .update(`${callName}${queryString}${sharedSecret}`)
    .digest("hex");
}

/**
 * Build a fully signed BigBlueButton API URL.
 */
export function buildApiUrl(
  bbbUrl: string,
  callName: string,
  params: Record<string, string>,
  sharedSecret: string
): string {
  const baseUrl = bbbUrl.replace(/\/+$/, "");
  const queryString = buildQueryString(params);
  const checksum = computeChecksum(callName, queryString, sharedSecret);
  return `${baseUrl}/api/${callName}?${queryString}&checksum=${checksum}`;
}
