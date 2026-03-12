/** Utility functions for handling email inputs in event type assignment */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function parseCommaSeparatedEmails(input: string): string[] {
  return input
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email && isValidEmail(email));
}

export function looksLikeEmail(input: string): boolean {
  return input.includes("@");
}
