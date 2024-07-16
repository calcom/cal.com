export const GOOGLE_CALENDAR_TYPE = "google_calendar";
export const GOOGLE_CALENDAR_ID = "google-calendar";
export const OFFICE_365_CALENDAR_TYPE = "office365_calendar";
export const OFFICE_365_CALENDAR_ID = "office365-calendar";
export const GOOGLE_CALENDAR = "google";
export const OFFICE_365_CALENDAR = "office365";
export const APPLE_CALENDAR = "apple";
export const APPLE_CALENDAR_TYPE = "apple_calendar";
export const APPLE_CALENDAR_ID = "apple-calendar";
export const CALENDARS = [GOOGLE_CALENDAR, OFFICE_365_CALENDAR, APPLE_CALENDAR] as const;

export const APPS_TYPE_ID_MAPPING = {
  [GOOGLE_CALENDAR_TYPE]: GOOGLE_CALENDAR_ID,
  [OFFICE_365_CALENDAR_TYPE]: OFFICE_365_CALENDAR_ID,
  [APPLE_CALENDAR_TYPE]: APPLE_CALENDAR_ID,
} as const;
