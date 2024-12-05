export const GOOGLE_CALENDAR_TYPE = "google_calendar";
export const GOOGLE_CALENDAR_ID = "google-calendar";
export const OFFICE_365_CALENDAR_TYPE = "office365_calendar";
export const OFFICE_365_CALENDAR_ID = "office365-calendar";
export const GOOGLE_CALENDAR = "google";
export const OFFICE_365_CALENDAR = "office365";
export const APPLE_CALENDAR = "apple";
export const ICS_CALENDAR = "ics-feed";
export const ICS_CALENDAR_ID = "ics-feed";
export const APPLE_CALENDAR_TYPE = "apple_calendar";
export const ICS_CALENDAR_TYPE = "ics-feed_calendar";
export const APPLE_CALENDAR_ID = "apple-calendar";
export const CALENDARS = [GOOGLE_CALENDAR, OFFICE_365_CALENDAR, APPLE_CALENDAR] as const;
export const CREDENTIAL_CALENDARS = [APPLE_CALENDAR] as const;

export const GOOGLE_MEET = "google-meet";
export const GOOGLE_MEET_TYPE = "google_video";
export const GOOGLE_MEET_ID = "google-meet";

export const ZOOM = "zoom";
export const ZOOM_TYPE = "zoom_video";

export const CAL_VIDEO = "daily-video";

export const CONFERENCING_APPS = [GOOGLE_MEET, ZOOM];
export const APPS_TYPE_ID_MAPPING = {
  [GOOGLE_CALENDAR_TYPE]: GOOGLE_CALENDAR_ID,
  [OFFICE_365_CALENDAR_TYPE]: OFFICE_365_CALENDAR_ID,
  [APPLE_CALENDAR_TYPE]: APPLE_CALENDAR_ID,
  [ICS_CALENDAR_TYPE]: ICS_CALENDAR_ID,
  [GOOGLE_MEET_TYPE]: GOOGLE_MEET_ID,
} as const;
