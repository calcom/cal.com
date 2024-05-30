export const GOOGLE_CALENDAR_TYPE = "google_calendar";
export const GOOGLE_CALENDAR_ID = "google-calendar";
export const OFFICE_365_CALENDAR_TYPE = "office365_calendar";
export const OFFICE_365_CALENDAR_ID = "office365-calendar";
export const GOOGLE_CALENDAR = "google";
export const MICROSOFT_OUTLOOK_CALENDAR = "google";
export const APPLE_CALENDAR = "apple";
export const CALENDARS = [GOOGLE_CALENDAR, APPLE_CALENDAR, MICROSOFT_OUTLOOK_CALENDAR] as const;

export const APPS_TYPE_ID_MAPPING = {
  [GOOGLE_CALENDAR_TYPE]: GOOGLE_CALENDAR_ID,
  [OFFICE_365_CALENDAR_TYPE]: OFFICE_365_CALENDAR_ID,
} as const;
