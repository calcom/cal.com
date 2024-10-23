export const SCOPE_USERINFO_PROFILE = "https://www.googleapis.com/auth/userinfo.profile";
export const SCOPE_CALENDAR_READONLY = "https://www.googleapis.com/auth/calendar.readonly";
export const SCOPE_CALENDAR_EVENT = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_MEET_API = "https://www.googleapis.com/auth/meetings.space.readonly";

export const REQUIRED_SCOPES = [SCOPE_CALENDAR_READONLY, SCOPE_CALENDAR_EVENT, GOOGLE_MEET_API];

export const SCOPES = [...REQUIRED_SCOPES, SCOPE_USERINFO_PROFILE];
