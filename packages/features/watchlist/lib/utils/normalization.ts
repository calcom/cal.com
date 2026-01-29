import { emailRegex } from "@calcom/lib/emailSchema";

/**
 * Centralized normalization utilities for emails and domains
 *
 */

/**
 * Normalizes an email address for consistent comparison
 *
 * Rules applied:
 * 1. Convert to lowercase
 * 2. Trim whitespace
 * 3. Validate basic email format
 *
 * @param email - Raw email address
 * @returns Normalized email address
 * @throws Error if email format is invalid
 */
export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();

  if (!emailRegex.test(normalized)) {
    throw new Error(`Invalid email format: ${email}`);
  }
  return normalized;
}

/**
 * Normalizes a domain for consistent comparison
 *
 * Rules applied:
 * 1. Convert to lowercase
 * 2. Trim whitespace
 * 3. Remove @ prefix if present
 *
 * Note: Domains are stored without @ prefix (e.g., mail.google.com, example.co.uk)
 * Wildcard matching is configurable:
 * - `*.cal.com` blocks all subdomains (app.cal.com, sub.app.cal.com, etc.)
 * - `cal.com` only blocks exact matches
 *
 * @param domain - Raw domain (with or without @ prefix)
 * @returns Normalized domain without @ prefix
 */
export function normalizeDomain(domain: string): string {
  let normalized = domain.trim().toLowerCase();

  if (normalized.startsWith("@")) {
    normalized = normalized.slice(1);
  }

  const domainRegex =
    /^[a-zA-Z0-9\u00a1-\uffff]([a-zA-Z0-9\u00a1-\uffff-]*[a-zA-Z0-9\u00a1-\uffff])?(\.[a-zA-Z0-9\u00a1-\uffff]([a-zA-Z0-9\u00a1-\uffff-]*[a-zA-Z0-9\u00a1-\uffff])?)*$/;
  if (!domainRegex.test(normalized)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }

  return normalized;
}

/**
 * Extracts and normalizes domain from an email address
 *
 * @param email - Email address
 * @returns Normalized domain without @ prefix
 */
export function extractDomainFromEmail(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const domain = normalizedEmail.split("@")[1];

  if (!domain) {
    throw new Error(`Could not extract domain from email: ${email}`);
  }

  return normalizeDomain(domain);
}

/**
 * Normalizes a username for consistent comparison
 *
 * Rules applied:
 * 1. Convert to lowercase
 * 2. Trim whitespace
 *
 * @param username - Raw username
 * @returns Normalized username
 */
export function normalizeUsername(username: string): string {
  if (!username || typeof username !== "string") {
    throw new Error("Invalid username: must be a non-empty string");
  }

  return username.trim().toLowerCase();
}

/**
 * Gets all wildcard patterns that could match a given domain.
 * Used to check if any wildcard entry (*.domain.com) would block this domain.
 *
 * Generates patterns for all ancestor domains to ensure higher-level wildcards are matched.
 * Only generates patterns where the parent has at least 2 parts (to avoid *.com).
 *
 * Example:
 * - Input: "sub.app.cal.com" -> Output: ["*.app.cal.com", "*.cal.com"]
 * - Input: "app.cal.com" -> Output: ["*.cal.com"]
 * - Input: "bloody-hell.cal.co.uk" -> Output: ["*.cal.co.uk"]
 * - Input: "cal.com" -> Output: [] (parent would be just "com")
 *
 * @param domain - Normalized domain (without @ prefix)
 * @returns Array of wildcard patterns from most specific to least specific
 */
export function getWildcardPatternsForDomain(domain: string): string[] {
  const parts = domain.split(".");
  const patterns: string[] = [];

  // Generate wildcard patterns for each ancestor domain (avoids *.com for 2-part domains)
  for (let i = 1; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join(".");
    patterns.push(`*.${parentDomain}`);
  }

  return patterns;
}

/**
 * Checks if a domain matches a watchlist entry value.
 * Supports both exact matching and wildcard matching.
 *
 * - Exact match: "cal.com" only matches "cal.com"
 * - Wildcard match: "*.cal.com" matches "app.cal.com", "sub.app.cal.com", etc.
 *
 * @param emailDomain - The domain extracted from an email (e.g., "app.cal.com")
 * @param watchlistValue - The value from the watchlist entry (e.g., "cal.com" or "*.cal.com")
 * @returns true if the domain matches the watchlist entry
 */
export function domainMatchesWatchlistEntry(emailDomain: string, watchlistValue: string): boolean {
  const normalizedEmailDomain = emailDomain.toLowerCase();
  const normalizedWatchlistValue = watchlistValue.toLowerCase();

  // Check for wildcard pattern
  if (normalizedWatchlistValue.startsWith("*.")) {
    const baseDomain = normalizedWatchlistValue.slice(2); // Remove "*." prefix
    // Check if emailDomain is a subdomain of baseDomain
    // e.g., "app.cal.com" ends with ".cal.com" (subdomain of cal.com)
    return normalizedEmailDomain.endsWith(`.${baseDomain}`);
  }

  // Exact match
  return normalizedEmailDomain === normalizedWatchlistValue;
}
