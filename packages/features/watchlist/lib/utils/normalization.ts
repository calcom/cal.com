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
 * Wildcard matching is supported - blocking cal.com will also block app.cal.com.
 * See getParentDomains() for the wildcard matching logic.
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
 * Gets all parent domains for wildcard matching.
 * Used to check if a domain or any of its parent domains are blocked.
 *
 * Example:
 * - Input: "app.cal.com"
 * - Output: ["app.cal.com", "cal.com"]
 *
 * Note: Does not include the TLD alone (e.g., "com") as that would be too broad.
 * Minimum domain returned has at least 2 parts (e.g., "cal.com").
 *
 * @param domain - Normalized domain (without @ prefix)
 * @returns Array of domains from most specific to least specific
 */
export function getParentDomains(domain: string): string[] {
  const parts = domain.split(".");

  if (parts.length < 2) {
    return [domain];
  }

  const domains: string[] = [];

  for (let i = 0; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join(".");
    domains.push(parentDomain);
  }

  return domains;
}
