export const SCOPE_USERINFO_PROFILE = "https://www.googleapis.com/auth/userinfo.profile";
export const SCOPE_CALENDAR_READONLY = "https://www.googleapis.com/auth/calendar.readonly";
export const SCOPE_CALENDAR_EVENT = "https://www.googleapis.com/auth/calendar.events";

export const REQUIRED_SCOPES = [SCOPE_CALENDAR_READONLY, SCOPE_CALENDAR_EVENT];

export const SCOPES = [...REQUIRED_SCOPES, SCOPE_USERINFO_PROFILE];
