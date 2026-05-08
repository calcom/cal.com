/**
 * Webhook URL validation — blocks SSRF via internal/loopback destinations.
 *
 * Cal.diy lets users register arbitrary webhook URLs. Without this guard,
 * an attacker can point a webhook at internal services (metadata APIs,
 * localhost, RFC-1918 ranges) and use Cal as a proxy to exfiltrate data
 * or hit unauthenticated internal endpoints.
 */

import { URL } from "url";

/** RFC-1918 + loopback + link-local ranges */
const BLOCKED_CIDRS = [
  /^127\./,                        // 127.0.0.0/8  loopback
  /^10\./,                         // 10.0.0.0/8   private
  /^192\.168\./,                  // 192.168.0.0/16 private
  /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16-31.x   private
  /^169\.254\./,                  // 169.254.0.0/16 link-local
  /^0\./,                          // 0.0.0.0/8
  /^::1$/,                          // IPv6 loopback
  /^fc00:/i,                        // IPv6 unique-local
  /^fe80:/i,                        // IPv6 link-local
];

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",       // GCP metadata
  "169.254.169.254",                 // AWS/Azure/GCP IMDS
  "100.100.100.200",                 // Alibaba Cloud metadata
]);

export interface WebhookUrlValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateWebhookUrl(raw: string): WebhookUrlValidationResult {
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  // Only allow https in production
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    return { valid: false, reason: "Webhook URL must use HTTPS in production" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(host)) {
    return { valid: false, reason: `Blocked host: ${host}` };
  }

  for (const pattern of BLOCKED_CIDRS) {
    if (pattern.test(host)) {
      return { valid: false, reason: `Blocked IP range: ${host}` };
    }
  }

  return { valid: true };
}
