import dns from "node:dns/promises";
import net from "node:net";

import logger from "@calcom/lib/logger";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({ prefix: ["ssrf-protection"] });

/**
 * SSRF protection helpers for server-side URL fetching
 *
 * This module should be used when fetching user-controlled URLs (e.g. logos, avatars) 
 * to ensure we don't accidentally access internal networks or cloud metadata services
 *
 * Keep this logic permissive enough to avoid breaking common image hosts
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
  /^::ffff:/i, // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1)
  /^fc/i, // unique local fc00::/7
  /^fd/i, // unique local
  /^fe80:/i, // link-local
  /^2001:db8:/i, // documentation range
];

// Cloud metadata endpoints and other blocked hostnames
const BLOCKED_HOSTNAMES: string[] = [
  "localhost", // loopback hostname
  "169.254.169.254", // AWS/Azure/DigitalOcean/Oracle metadata
  "169.254.169.253", // Azure alternate
  "metadata.google.internal", // GCP metadata
  "metadata.google.com", // GCP alternate
];

// Error messages
const ERRORS = {
  HTTPS_ONLY: "Only HTTPS URLs are allowed",
  PRIVATE_IP: "Private IP address",
  PRIVATE_IP_DNS: "Hostname resolves to private IP",
  BLOCKED_HOSTNAME: "Blocked hostname",
  INVALID_URL: "Invalid URL format",
  NON_IMAGE_DATA_URL: "Non-image data URL",
} as const;

// Normalize hostname by removing trailing dot
function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

// Extract IPv4 from IPv4-mapped IPv6 address (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
function extractIPv4FromMappedIPv6(ip: string): string | null {
  const match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (match) {
    return match[1];
  }
  return null;
}

// Check if an IP address is private/internal
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

// Check if a hostname is in the blocked list
export function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return BLOCKED_HOSTNAMES.includes(normalized);
}

export interface SSRFValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * SSRF validation for user-provided URLs that are fetched server-side
 *
 * Async variant: it resolves the hostname and rejects URLs that point to
 * private networks, metadata endpoints, or rebinding targets
 */
export async function validateUrlForSSRF(urlString: string): Promise<SSRFValidationResult> {
  // Data URLs with image/ content type are safe (no network fetch)
  if (urlString.startsWith("data:image/")) {
    return { isValid: true };
  }

  // Block non-image data URLs
  if (urlString.startsWith("data:")) {
    return { isValid: false, error: ERRORS.NON_IMAGE_DATA_URL };
  }

  try {
    const url = new URL(urlString);

    // Only allow HTTPS (HTTP is insecure for external resources)
    if (url.protocol !== "https:") {
      return { isValid: false, error: ERRORS.HTTPS_ONLY };
    }

    // Check blocked hostnames (with normalization)
    if (isBlockedHostname(url.hostname)) {
      return { isValid: false, error: ERRORS.BLOCKED_HOSTNAME };
    }

    // Check if hostname is a direct IP
    const ipVersion = net.isIP(url.hostname);

    if (ipVersion !== 0) {
      // It's an IP address (4 or 6)
      if (isPrivateIP(url.hostname)) {
        return { isValid: false, error: ERRORS.PRIVATE_IP };
      }
    }

    // DNS rebinding protection: resolve ALL IPs and check each one
    try {
      const addresses = await dns.lookup(url.hostname, { all: true });
      for (const { address } of addresses) {
        if (isPrivateIP(address)) {
          return { isValid: false, error: ERRORS.PRIVATE_IP_DNS };
        }
      }
    } catch {
      // Intentionally allowing DNS failures here to avoid breaking legitimate
      // third-party image hosts with flaky or slow DNS
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: ERRORS.INVALID_URL };
  }
}

/**
 * Synchronous version of validateUrlForSSRF (without DNS check)
 *
 * Use this for Zod schemas and other synchronous validation contexts
 * Note: This does not protect against DNS rebinding attacks
 */
export function validateUrlForSSRFSync(urlString: string): SSRFValidationResult {
  // Data URLs with image/ content type are safe (no network fetch)
  if (urlString.startsWith("data:image/")) {
    return { isValid: true };
  }

  // Block non-image data URLs
  if (urlString.startsWith("data:")) {
    return { isValid: false, error: ERRORS.NON_IMAGE_DATA_URL };
  }

  try {
    const url = new URL(urlString);

    // Only allow HTTPS (HTTP is insecure for external resources)
    if (url.protocol !== "https:") {
      return { isValid: false, error: ERRORS.HTTPS_ONLY };
    }

    // Check blocked hostnames (with normalization)
    if (isBlockedHostname(url.hostname)) {
      return { isValid: false, error: ERRORS.BLOCKED_HOSTNAME };
    }

    // Check if hostname is a direct IP address
    const ipVersion = net.isIP(url.hostname);

    if (ipVersion !== 0) {
      // It's an IP address (4 or 6)
      if (isPrivateIP(url.hostname)) {
        return { isValid: false, error: ERRORS.PRIVATE_IP };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: ERRORS.INVALID_URL };
  }
}

// Check if a URL is a trusted internal URL (same origin as webapp)
export function isTrustedInternalUrl(url: string, webappUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(webappUrl).origin;
  } catch {
    return false;
  }
}

// Log a blocked SSRF attempt for security monitoring
export function logBlockedSSRFAttempt(url: string, reason: string, context?: Record<string, unknown>): void {
  log.warn("SSRF attempt blocked", {
    url: url.substring(0, 100), // Truncate for log safety
    reason,
    ...context,
  });
}
