import type { CalendarProvider } from "./types";

const PALETTE = {
  slateBlue: "hsl(220, 30%, 58%)",
  softEmerald: "hsl(158, 28%, 50%)",
  mutedPurple: "hsl(265, 25%, 58%)",
  neutralGray: "hsl(220, 10%, 55%)",
};

export { PALETTE };

export const CALENDAR_COLORS = [
  PALETTE.slateBlue,
  PALETTE.softEmerald,
  PALETTE.mutedPurple,
  PALETTE.neutralGray,
];

export const PROVIDER_LABELS: Record<CalendarProvider, string> = {
  google: "GOOGLE",
  outlook: "OUTLOOK",
};

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
];

export const MONTH_VIEW_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
