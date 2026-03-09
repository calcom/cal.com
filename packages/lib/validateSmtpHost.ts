import { isIP } from "net";

/**
 * Only block addresses that are never legitimate SMTP servers:
 * - Loopback (127.x) - no real mail server runs here in production
 * - Link-local / cloud metadata (169.254.x) - AWS/GCP metadata exfil vector
 * - "This" network (0.x) - never valid
 *
 * We intentionally allow RFC-1918 (10.x, 172.16-31.x, 192.168.x) because
 * self-hosted / on-prem deployments may use internal SMTP relays.
 */
const BLOCKED_IP_PATTERNS = [
  /^127\./, // IPv4 loopback
  /^169\.254\./, // Link-local / cloud metadata
  /^0\./, // "this" network
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^::ffff:(127\.|169\.254\.)/i, // IPv4-mapped IPv6 loopback/link-local
];

const BLOCKED_HOSTNAMES = ["localhost", "metadata.google.internal", "metadata.internal", "instance-data"];

function isDangerousIP(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Validates that an SMTP host is not a loopback, link-local, or cloud metadata address.
 * Prevents SSRF while allowing legitimate internal SMTP relays on private networks.
 */
export function validateSmtpHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(normalized)) {
    return false;
  }

  if (isIP(normalized)) {
    return !isDangerousIP(normalized);
  }

  return true;
}
