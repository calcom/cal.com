import { parse as tldtsParse } from "tldts";

/**
 * Strips protocol, www, path, port, query, fragment, and lowercases.
 *
 * Examples:
 *   `https://www.acme.com/about/?ref=google#section` → `acme.com`
 *   `HTTP://ACME.COM:443/en/`                        → `acme.com`
 *   `acme.com`                                        → `acme.com` (no-op)
 */
export function normalizeWebsiteUrl(url: string): string {
  if (!url || typeof url !== "string") return "";

  let cleaned = url.trim().toLowerCase();
  if (!cleaned) return "";

  // Strip protocol (handle double-protocol typos like https://https://...)
  cleaned = cleaned.replace(/^(?:https?:\/\/)+/, "");

  // Strip www. prefix
  if (cleaned.startsWith("www.")) {
    cleaned = cleaned.slice(4);
  }

  // Strip everything after the host: path, query, fragment
  const slashIndex = cleaned.indexOf("/");
  if (slashIndex !== -1) {
    cleaned = cleaned.slice(0, slashIndex);
  }

  const questionIndex = cleaned.indexOf("?");
  if (questionIndex !== -1) {
    cleaned = cleaned.slice(0, questionIndex);
  }

  const hashIndex = cleaned.indexOf("#");
  if (hashIndex !== -1) {
    cleaned = cleaned.slice(0, hashIndex);
  }

  // Strip port
  const colonIndex = cleaned.lastIndexOf(":");
  if (colonIndex !== -1) {
    const afterColon = cleaned.slice(colonIndex + 1);
    if (/^\d+$/.test(afterColon)) {
      cleaned = cleaned.slice(0, colonIndex);
    }
  }

  // Strip trailing dot (DNS root notation)
  if (cleaned.endsWith(".")) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
}

export interface BaseDomainResult {
  baseDomain: string;
  registrableDomain: string;
}

/**
 * TLD-aware base domain extraction using the Mozilla Public Suffix List (via `tldts`).
 *
 * Given a URL or bare domain, returns the "company" label and the full registrable domain.
 * Handles all 9,000+ TLD patterns including multi-level ones like `.co.uk`, `.com.au`, etc.
 *
 * Returns `null` for inputs that aren't valid domain names (IPs, localhost, empty, single-label).
 */
export function extractBaseDomain(input: string): BaseDomainResult | null {
  const domain = normalizeWebsiteUrl(input);
  if (!domain) return null;

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) return null;

  const parsed = tldtsParse(domain, { allowPrivateDomains: false });

  if (!parsed.domainWithoutSuffix || !parsed.domain) return null;

  return {
    baseDomain: parsed.domainWithoutSuffix,
    registrableDomain: parsed.domain,
  };
}
