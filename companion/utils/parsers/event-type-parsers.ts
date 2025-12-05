/**
 * Helper functions to parse form values into API-compatible formats
 */

export const parseBufferTime = (buffer: string): number => {
  const match = buffer.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

export const parseMinimumNotice = (value: string, unit: string): number => {
  const val = parseInt(value) || 0;
  if (unit === "Hours") return val * 60;
  if (unit === "Days") return val * 24 * 60;
  return val; // Minutes
};

export const parseFrequencyUnit = (unit: string): string | null => {
  const normalized = unit.toLowerCase();
  if (normalized.includes("day")) return "day";
  if (normalized.includes("week")) return "week";
  if (normalized.includes("month")) return "month";
  if (normalized.includes("year")) return "year";
  return null;
};

export const parseSlotInterval = (interval: string): number => {
  const match = interval.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};
