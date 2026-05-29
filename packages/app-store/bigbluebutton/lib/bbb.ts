import { createHash } from "node:crypto";

/**
 * Builds a URL-encoded query string from a key-value object.
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
    }
  }
  return parts.join("&");
}

/**
 * Computes the BigBlueButton SHA-1 checksum.
 */
export function computeChecksum(apiCallName: string, queryString: string, sharedSecret: string): string {
  const concatenation = apiCallName + queryString + sharedSecret;
  return createHash("sha1").update(concatenation).digest("hex");
}

/**
 * Forms the full BigBlueButton request URL.
 */
export function buildApiUrl(
  serverUrl: string,
  apiCallName: string,
  params: Record<string, string | number | boolean | undefined | null>,
  sharedSecret: string
): string {
  const cleanServerUrl = serverUrl.replace(/\/+$/, "");
  const queryString = buildQueryString(params);
  const checksum = computeChecksum(apiCallName, queryString, sharedSecret);

  if (queryString) {
    return `${cleanServerUrl}/${apiCallName}?${queryString}&checksum=${checksum}`;
  }
  return `${cleanServerUrl}/${apiCallName}?checksum=${checksum}`;
}
