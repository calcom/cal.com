/**
 * Utility functions for handling email inputs in event type assignment
 */

/**
 * Validates if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Parses comma-separated emails and returns array of valid emails
 * @param input - String containing comma-separated emails
 * @returns Array of valid email addresses
 */
export function parseCommaSeparatedEmails(input: string): string[] {
  return input
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email && isValidEmail(email));
}

/**
 * Checks if input looks like an email (contains @ symbol)
 */
export function looksLikeEmail(input: string): boolean {
  return input.includes("@");
}
