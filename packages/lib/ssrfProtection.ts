import dns from "node:dns/promises";
import net from "node:net";

import logger from "@calcom/lib/logger";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({ prefix: ["ssrf-protection"] });

/**
 * SSRF protection helpers for server-side URL fetching
 *
 * Use when fetching user-controlled URLs (logos, avatars, webhooks) to prevent
 * access to internal networks and cloud metadata services
 */

// Private IPv4 ranges (RFC1918 + special ranges)
const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private
  /^192\.168\./, // 192.168.0.0/16 private
  /^169\.254\./, // 169.254.0.0/16 link-local
  /^0\./, // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./, // 100.64.0.0/10 shared
];

// Private IPv6 patterns
const PRIVATE_IPV6_PATTERNS: RegExp[] = [
  /^::1$/i, // loopback
  /^::$/i, // unspecified address
  /^::ffff:/i, // IPv4-mapped (e.g., ::ffff:127.0.0.1)
  /^fc/i, // unique local fc00::/7
  /^fd/i, // unique local
  /^fe80:/i, // link-local
  /^2001:db8:/i, // documentation range
];

// Cloud metadata endpoints
const BLOCKED_HOSTNAMES: string[] = [
  "localhost",
  "169.254.169.254", // AWS/Azure/DigitalOcean/Oracle metadata
  "169.254.169.253", // Azure alternate
  "metadata.google.internal", // GCP metadata
  "metadata.google.com", // GCP alternate
];

const ERRORS = {
  HTTPS_ONLY: "Only HTTPS URLs are allowed",
  PRIVATE_IP: "Private IP address",
  PRIVATE_IP_DNS: "Hostname resolves to private IP",
  BLOCKED_HOSTNAME: "Blocked hostname",
  INVALID_URL: "Invalid URL format",
  NON_IMAGE_DATA_URL: "Non-image data URL",
} as const;

/** Normalize hostname: lowercase and remove trailing dot (FQDN format) */
function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

// Extracts IPv4 from mapped address (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
function extractIPv4FromMappedIPv6(ip: string): string | null {
  const match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (match) {
    return match[1];
  }
  return null;
}

/** Check if an IP address belongs to private/internal ranges (RFC1918, link-local, etc.) */
export function isPrivateIP(ip: string): boolean {
  const mappedIPv4 = extractIPv4FromMappedIPv6(ip);
  if (mappedIPv4) {
    return isPrivateIP(mappedIPv4);
  }

  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(ip))) {
    return true;
  }

  if (PRIVATE_IPV6_PATTERNS.some((pattern) => pattern.test(ip))) {
    return true;
  }

  return false;
}

/** Check if hostname is a blocked cloud metadata endpoint or localhost */
export function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return BLOCKED_HOSTNAMES.includes(normalized);
}

export interface SSRFValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Core validation logic shared by sync and async versions
 * Returns SSRFValidationResult if validation completes, or { url } if DNS check is needed
 */
function validateUrlCore(urlString: string): SSRFValidationResult | { url: URL } {
  // Data URLs with image/* are safe (no network fetch)
  if (urlString.startsWith("data:image/")) {
    return { isValid: true };
  }

  if (urlString.startsWith("data:")) {
    return { isValid: false, error: ERRORS.NON_IMAGE_DATA_URL };
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { isValid: false, error: ERRORS.INVALID_URL };
  }

  if (url.protocol !== "https:") {
    return { isValid: false, error: ERRORS.HTTPS_ONLY };
  }

  if (isBlockedHostname(url.hostname)) {
    return { isValid: false, error: ERRORS.BLOCKED_HOSTNAME };
  }

  if (net.isIP(url.hostname) !== 0 && isPrivateIP(url.hostname)) {
    return { isValid: false, error: ERRORS.PRIVATE_IP };
  }

  return { url };
}

/**
 * Async SSRF validation with DNS rebinding protection
 * Resolves hostname and checks all IPs against private ranges
 */
export async function validateUrlForSSRF(urlString: string): Promise<SSRFValidationResult> {
  const result = validateUrlCore(urlString);

  if ("isValid" in result) {
    return result;
  }

  // DNS rebinding protection: resolve ALL IPs and check each one
  try {
    const addresses = await dns.lookup(result.url.hostname, { all: true });
    for (const { address } of addresses) {
      if (isPrivateIP(address)) {
        return { isValid: false, error: ERRORS.PRIVATE_IP_DNS };
      }
    }
  } catch {
    // Allow DNS failures to avoid breaking legitimate hosts with flaky DNS
  }

  return { isValid: true };
}

/**
 * Sync SSRF validation for Zod schemas (no DNS check)
 * Does not protect against DNS rebinding - use async version when possible
 */
export function validateUrlForSSRFSync(urlString: string): SSRFValidationResult {
  const result = validateUrlCore(urlString);

  if ("isValid" in result) {
    return result;
  }

  return { isValid: true };
}

/** Check if URL belongs to the same origin as the webapp (trusted internal URL) */
export function isTrustedInternalUrl(url: string, webappUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(webappUrl).origin;
  } catch {
    return false;
  }
}

/** Log blocked SSRF attempts for security monitoring and incident response */
export function logBlockedSSRFAttempt(url: string, reason: string, context?: Record<string, unknown>): void {
  log.warn("SSRF attempt blocked", {
    url: url.substring(0, 100), // Truncate for log safety
    reason,
    ...context,
  });
}
