export const GOOGLE_CALENDAR_TYPE = "google_calendar";
export const GOOGLE_CALENDAR_ID = "google-calendar";
export const OFFICE_365_CALENDAR_TYPE = "office365_calendar";
export const OFFICE_365_CALENDAR_ID = "office365-calendar";
export const GOOGLE_CALENDAR = "google";
export const OFFICE_365_CALENDAR = "office365";
export const APPLE_CALENDAR = "apple";
// APPLE_CALENDAR is not implemented yet
export const CALENDARS = [GOOGLE_CALENDAR, OFFICE_365_CALENDAR] as const;

export const APPS_TYPE_ID_MAPPING = {
  [GOOGLE_CALENDAR_TYPE]: GOOGLE_CALENDAR_ID,
  [OFFICE_365_CALENDAR_TYPE]: OFFICE_365_CALENDAR_ID,
} as const;
