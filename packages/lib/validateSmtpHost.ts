import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

/**
 * Only block addresses that are never legitimate SMTP servers:
 * - Loopback (127.x, ::1) - no real mail server runs here in production
 * - Link-local / cloud metadata (169.254.x, fe80::) - AWS/GCP metadata exfil vector
 * - "This" network (0.x) - never valid
 *
 * We intentionally allow RFC-1918 (10.x, 172.16-31.x, 192.168.x) because
 * self-hosted / on-prem deployments may use internal SMTP relays.
 *
 * Uses ipaddr.js for proper IPv6 normalization to prevent bypasses via
 * expanded address forms (e.g. 0:0:0:0:0:0:0:1 for ::1).
 */
const BLOCKED_IP_RANGES: Set<string> = new Set(["loopback", "linkLocal", "unspecified"]);

const BLOCKED_HOSTNAMES: string[] = [
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
  "instance-data",
];

function isDangerousIP(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);

    // For IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1),
    // extract the underlying IPv4 address and check its range.
    if (addr.kind() === "ipv6" && addr.isIPv4MappedAddress()) {
      const ipv4Addr = addr.toIPv4Address();
      return BLOCKED_IP_RANGES.has(ipv4Addr.range());
    }

    return BLOCKED_IP_RANGES.has(addr.range());
  } catch {
    // If ipaddr.js cannot parse it, fall back to false (allow).
    // Non-IP strings are handled by the hostname check.
    return false;
  }
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
