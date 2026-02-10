/**
 * Sanitizes user name input to prevent URL/HTML injection
 * This is a defense-in-depth measure alongside schema validation
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets to prevent HTML tags
    .replace(/https?:\/\/[^\s]+/gi, "") // Remove URLs
    .slice(0, 50); // Enforce max length as additional safety
}
