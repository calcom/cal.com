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
 * No subdomain stripping is performed to avoid multi-level TLD issues.
 * If you want to block subdomains separately, create separate entries.
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
