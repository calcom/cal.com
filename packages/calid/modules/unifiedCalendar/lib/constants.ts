import type { SupportedCalendarProvider } from "./types";

const PALETTE = {
  slateBlue: "hsl(220, 30%, 58%)",
  softEmerald: "hsl(158, 28%, 50%)",
  mutedPurple: "hsl(265, 25%, 58%)",
  neutralGray: "hsl(220, 10%, 55%)",
  warmAmber: "hsl(36, 65%, 56%)",
  roseRed: "hsl(355, 56%, 58%)",
};

export { PALETTE };

export const CALENDAR_COLORS = [
  PALETTE.slateBlue,
  PALETTE.softEmerald,
  PALETTE.mutedPurple,
  PALETTE.neutralGray,
];

export const PROVIDER_LABELS: Record<SupportedCalendarProvider, string> = {
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

export const INTERNAL_EVENT_COLOR_FAMILY = {
  primary: PALETTE.slateBlue,
  secondary: PALETTE.softEmerald,
};

export const EXTERNAL_PROVIDER_COLOR_FAMILIES: Record<SupportedCalendarProvider, string[]> = {
  google: [PALETTE.softEmerald, PALETTE.slateBlue, PALETTE.warmAmber],
  outlook: [PALETTE.mutedPurple, PALETTE.neutralGray, PALETTE.roseRed],
};

export const UNIFIED_EVENT_FALLBACK_TITLE = "Untitled event";
