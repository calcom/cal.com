/** Number of months to check for booking conflicts */
export const CONFLICT_CHECK_MONTHS = 3;

/** Default number of days to cache holiday data */
export const DEFAULT_HOLIDAY_CACHE_DAYS = 7;

/**
 * Google Calendar IDs for public holiday calendars.
 * Only includes countries with official Google public holiday calendars.
 * Source: Google Calendar API
 */
export const GOOGLE_HOLIDAY_CALENDARS: Record<string, { name: string; calendarId: string }> = {
  US: { name: "United States", calendarId: "en.usa#holiday@group.v.calendar.google.com" },
  GB: { name: "United Kingdom", calendarId: "en.uk#holiday@group.v.calendar.google.com" },
  CA: { name: "Canada", calendarId: "en.canadian#holiday@group.v.calendar.google.com" },
  AU: { name: "Australia", calendarId: "en.australian#holiday@group.v.calendar.google.com" },
  DE: { name: "Germany", calendarId: "en.german#holiday@group.v.calendar.google.com" },
  FR: { name: "France", calendarId: "en.french#holiday@group.v.calendar.google.com" },
  ES: { name: "Spain", calendarId: "en.spain#holiday@group.v.calendar.google.com" },
  NL: { name: "Netherlands", calendarId: "en.dutch#holiday@group.v.calendar.google.com" },
  IT: { name: "Italy", calendarId: "en.italian#holiday@group.v.calendar.google.com" },
  BR: { name: "Brazil", calendarId: "en.brazilian#holiday@group.v.calendar.google.com" },
  MX: { name: "Mexico", calendarId: "en.mexican#holiday@group.v.calendar.google.com" },
  IN: { name: "India", calendarId: "en.indian#holiday@group.v.calendar.google.com" },
  IE: { name: "Ireland", calendarId: "en.irish#holiday@group.v.calendar.google.com" },
  NZ: { name: "New Zealand", calendarId: "en.new_zealand#holiday@group.v.calendar.google.com" },
  SE: { name: "Sweden", calendarId: "en.swedish#holiday@group.v.calendar.google.com" },
  NO: { name: "Norway", calendarId: "en.norwegian#holiday@group.v.calendar.google.com" },
  DK: { name: "Denmark", calendarId: "en.danish#holiday@group.v.calendar.google.com" },
  AT: { name: "Austria", calendarId: "en.austrian#holiday@group.v.calendar.google.com" },
  JP: { name: "Japan", calendarId: "en.japanese#holiday@group.v.calendar.google.com" },
  CN: { name: "China", calendarId: "en.china#holiday@group.v.calendar.google.com" },
  KR: { name: "South Korea", calendarId: "en.south_korea#holiday@group.v.calendar.google.com" },
  SG: { name: "Singapore", calendarId: "en.singapore#holiday@group.v.calendar.google.com" },
  HK: { name: "Hong Kong", calendarId: "en.hong_kong#holiday@group.v.calendar.google.com" },
  TW: { name: "Taiwan", calendarId: "en.taiwan#holiday@group.v.calendar.google.com" },
  TH: { name: "Thailand", calendarId: "en.thai#holiday@group.v.calendar.google.com" },
  MY: { name: "Malaysia", calendarId: "en.malaysia#holiday@group.v.calendar.google.com" },
  ID: { name: "Indonesia", calendarId: "en.indonesian#holiday@group.v.calendar.google.com" },
  PH: { name: "Philippines", calendarId: "en.philippines#holiday@group.v.calendar.google.com" },
  VN: { name: "Vietnam", calendarId: "en.vietnamese#holiday@group.v.calendar.google.com" },
  RU: { name: "Russia", calendarId: "en.russian#holiday@group.v.calendar.google.com" },
  PL: { name: "Poland", calendarId: "en.polish#holiday@group.v.calendar.google.com" },
  GR: { name: "Greece", calendarId: "en.greek#holiday@group.v.calendar.google.com" },
  PT: { name: "Portugal", calendarId: "en.portuguese#holiday@group.v.calendar.google.com" },
  FI: { name: "Finland", calendarId: "en.finnish#holiday@group.v.calendar.google.com" },
  ZA: { name: "South Africa", calendarId: "en.sa#holiday@group.v.calendar.google.com" },
  IR: { name: "Iran", calendarId: "en.iranian#holiday@group.v.calendar.google.com" },
};

/** Get holiday cache duration from env or use default */
export function getHolidayCacheDays(): number {
  const envValue = process.env.HOLIDAY_CACHE_DAYS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_HOLIDAY_CACHE_DAYS;
}
