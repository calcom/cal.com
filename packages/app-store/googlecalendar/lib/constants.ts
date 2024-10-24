export const SCOPE_USERINFO_PROFILE = "https://www.googleapis.com/auth/userinfo.profile";
export const SCOPE_CALENDAR_READONLY = "https://www.googleapis.com/auth/calendar.readonly";
export const SCOPE_CALENDAR_EVENT = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_MEET_API = "https://www.googleapis.com/auth/meetings.space.readonly";
export const SCOPE_USERINFO_EMAIL = "https://www.googleapis.com/auth/userinfo.email";

export const SCOPE_USER_CONTACTS = "https://www.googleapis.com/auth/contacts.readonly";
export const SCOPE_OTHER_USER_CONTACTS = "https://www.googleapis.com/auth/contacts.other.readonly";

export const REQUIRED_SCOPES = [SCOPE_CALENDAR_READONLY, SCOPE_CALENDAR_EVENT, GOOGLE_MEET_API];

export const SCOPES = [
  ...REQUIRED_SCOPES,
  SCOPE_USERINFO_EMAIL,
  SCOPE_USERINFO_PROFILE,
  SCOPE_USER_CONTACTS,
  SCOPE_OTHER_USER_CONTACTS,
];
