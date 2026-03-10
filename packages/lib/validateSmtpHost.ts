import dns from "node:dns/promises";
import { isIP } from "node:net";

import ipaddr from "ipaddr.js";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { isBlockedHostname, isPrivateIP } from "@calcom/lib/ssrfProtection";

/**
 * SMTP host validation composing on ssrfProtection.ts.
 *
 * SaaS: blocks all private/reserved IPs (same as webhook validation).
 * Self-hosted: only blocks loopback, link-local, unspecified -- RFC-1918 is
 * allowed for internal SMTP relays (Postfix, etc.).
 *
 * Uses ipaddr.js for proper IPv6 normalization to prevent bypasses via
 * expanded address forms (e.g. 0:0:0:0:0:0:0:1 for ::1).
 */

// Subset of ranges blocked even when self-hosted (RFC-1918 intentionally omitted)
const SELF_HOSTED_BLOCKED_RANGES: Set<string> = new Set(["loopback", "linkLocal", "unspecified"]);

function isSelfHostedDangerousIP(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);

    if (addr.kind() === "ipv6" && addr.isIPv4MappedAddress()) {
      return SELF_HOSTED_BLOCKED_RANGES.has(addr.toIPv4Address().range());
    }

    return SELF_HOSTED_BLOCKED_RANGES.has(addr.range());
  } catch {
    return false;
  }
}

function isSmtpIPBlocked(ip: string): boolean {
  if (IS_SELF_HOSTED) {
    return isSelfHostedDangerousIP(ip);
  }
  return isPrivateIP(ip);
}

/**
 * Sync validation for Zod schemas.
 * Checks hostname blocklist and IP ranges but cannot detect DNS rebinding.
 * Use resolveAndValidateSmtpHost() for full protection.
 */
export function validateSmtpHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();

  if (isBlockedHostname(normalized)) {
    return false;
  }

  if (isIP(normalized)) {
    return !isSmtpIPBlocked(normalized);
  }

  return true;
}

/**
 * Async validation with DNS rebinding protection.
 * Resolves the hostname and checks all resolved IPs against the
 * appropriate blocklist (SaaS vs self-hosted).
 */
export async function resolveAndValidateSmtpHost(
  host: string
): Promise<{ valid: boolean; error?: string }> {
  if (!validateSmtpHost(host)) {
    return { valid: false, error: "SMTP host must be a public address" };
  }

  const trimmed = host.trim();

  // IP literals are fully covered by the sync check
  if (isIP(trimmed)) {
    return { valid: true };
  }

  // DNS rebinding protection: resolve and check every address
  try {
    const addresses = await dns.lookup(trimmed, { all: true });
    for (const { address } of addresses) {
      if (isSmtpIPBlocked(address)) {
        return { valid: false, error: "SMTP hostname resolves to a blocked address" };
      }
    }
  } catch {
    // Allow DNS failures to avoid breaking legitimate hosts with transient DNS issues
  }

  return { valid: true };
}
