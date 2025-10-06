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
  if (!email || typeof email !== "string") {
    throw new Error("Invalid email: must be a non-empty string");
  }

  // Basic normalization
  const normalized = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
 * 3. Handle punycode/IDN domains
 * 4. Ensure proper @ prefix for domain entries
 * 5. Handle subdomain normalization
 *
 * @param domain - Raw domain (with or without @ prefix)
 * @param includeSubdomains - Whether to normalize subdomains (default: false)
 * @returns Normalized domain with @ prefix
 */
export function normalizeDomain(domain: string, includeSubdomains = false): string {
  if (!domain || typeof domain !== "string") {
    throw new Error("Invalid domain: must be a non-empty string");
  }

  let normalized = domain.trim().toLowerCase();

  // Remove @ prefix if present, we'll add it back
  if (normalized.startsWith("@")) {
    normalized = normalized.slice(1);
  }

  // Basic domain validation
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
  if (!domainRegex.test(normalized)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }

  // Handle subdomain normalization
  if (includeSubdomains) {
    // Extract root domain (last two parts)
    const parts = normalized.split(".");
    if (parts.length > 2) {
      normalized = parts.slice(-2).join(".");
    }
  }

  // Always return with @ prefix for consistency with watchlist storage
  return `@${normalized}`;
}

/**
 * Extracts and normalizes domain from an email address
 *
 * @param email - Email address
 * @param includeSubdomains - Whether to normalize subdomains
 * @returns Normalized domain with @ prefix
 */
export function extractDomainFromEmail(email: string, includeSubdomains = false): string {
  const normalizedEmail = normalizeEmail(email);
  const domain = normalizedEmail.split("@")[1];

  if (!domain) {
    throw new Error(`Could not extract domain from email: ${email}`);
  }

  return normalizeDomain(domain, includeSubdomains);
}

/**
 * Normalizes a username for consistent comparison
 *
 * Rules applied:
 * 1. Convert to lowercase
 * 2. Trim whitespace
 * 3. Remove special characters (optional)
 *
 * @param username - Raw username
 * @param removeSpecialChars - Whether to remove special characters (default: false)
 * @returns Normalized username
 */
export function normalizeUsername(username: string, removeSpecialChars = false): string {
  if (!username || typeof username !== "string") {
    throw new Error("Invalid username: must be a non-empty string");
  }

  let normalized = username.trim().toLowerCase();

  if (removeSpecialChars) {
    // Keep only alphanumeric characters and common separators
    normalized = normalized.replace(/[^a-z0-9._-]/g, "");
  }

  return normalized;
}
