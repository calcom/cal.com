/**
 * Helper functions to parse form values into API-compatible formats
 * Used for event type form handling
 */

/**
 * Parse buffer time string to minutes
 * @param buffer - Buffer time string (e.g., "15 minutes", "30")
 * @returns Number of minutes
 */
export const parseBufferTime = (buffer: string): number => {
  const match = buffer.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Parse minimum notice value and unit to total minutes
 * @param value - Numeric value as string
 * @param unit - Unit ("Minutes", "Hours", "Days")
 * @returns Total minutes
 */
export const parseMinimumNotice = (value: string, unit: string): number => {
  const val = parseInt(value, 10) || 0;
  if (unit === "Hours") return val * 60;
  if (unit === "Days") return val * 24 * 60;
  return val; // Minutes
};

/**
 * Parse frequency unit string to API format
 * @param unit - Unit string (e.g., "Weeks", "Monthly")
 * @returns Normalized unit ("day", "week", "month", "year") or null
 */
export const parseFrequencyUnit = (unit: string): string | null => {
  const normalized = unit.toLowerCase();
  if (normalized.includes("day")) return "day";
  if (normalized.includes("week")) return "week";
  if (normalized.includes("month")) return "month";
  if (normalized.includes("year")) return "year";
  return null;
};

/**
 * Parse slot interval string to minutes
 * @param interval - Interval string (e.g., "15 minutes", "30")
 * @returns Number of minutes
 */
export const parseSlotInterval = (interval: string): number => {
  const match = interval.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};
