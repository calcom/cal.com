/**
 * Daily Color System
 *
 * Generates a unique color for each day using a hash-based approach.
 * Matches the implementation from hugo-theme-codex:
 * https://github.com/twcurrie/hugo-theme-codex/commit/630cd8a4c317e3d2444e2eb9ef0313cbad00c20e
 */

/**
 * Implements a Java-style string hashing algorithm
 * @param str - The string to hash
 * @returns A 32-bit integer hash
 */
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Converts a hash integer into a hexadecimal color code
 * @param i - The integer to convert
 * @returns A hex color string (e.g., "#A3B2C1")
 */
export function intToRGB(i: number): string {
  const rgb = (i & 0x00ffffff).toString(16).toUpperCase().padStart(6, "0");
  return `#${rgb}`;
}

/**
 * Generates a color based on the current UTC date
 * The color changes daily at midnight UTC
 * @returns A hex color string for today's date
 */
export function getDailyColor(): string {
  const now = new Date();
  const dateString = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
  const hash = hashCode(dateString);
  return intToRGB(hash);
}

/**
 * Gets the daily color and applies it to CSS custom properties
 * This function should be called on the client side
 */
export function applyDailyColor(): void {
  if (typeof document !== "undefined") {
    const dailyColor = getDailyColor();
    document.documentElement.style.setProperty("--brand-color", dailyColor);
    document.documentElement.style.setProperty("--cal-brand", dailyColor);
  }
}
