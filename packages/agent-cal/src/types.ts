/**
 * TypeScript types for Cal.com Unified Calendar API (v2).
 * Matches the API response and request shapes.
 */

/** Calendar provider identifier. Currently only "google" is supported for full CRUD. */
export type CalendarSource = "google" | "office365" | "apple";

/** Start/end with time and time zone (API shape). */
export interface DateTimeWithZone {
  time: string; // ISO 8601 date-time
  timeZone: string; // IANA time zone
}

/** Conference/location entry (video, phone, sip, more). */
export interface CalendarEventLocation {
  type: string;
  url: string;
  label?: string;
  pin?: string;
  regionCode?: string;
  password?: string;
  meetingCode?: string;
  accessCode?: string;
}

/** Attendee on an event. */
export interface CalendarEventAttendee {
  email: string;
  name?: string;
  responseStatus?: "accepted" | "pending" | "declined" | "needsAction" | null;
  self?: boolean;
  optional?: boolean;
  host?: boolean;
}

/** Host/organizer. */
export interface CalendarEventHost {
  email: string;
  name?: string;
  responseStatus?: "accepted" | "pending" | "declined" | "needsAction" | null;
}

/** Event status. */
export type CalendarEventStatus = "accepted" | "pending" | "declined" | "cancelled";

/** Unified calendar event (get/list/create/update response). */
export interface UnifiedCalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start: DateTimeWithZone;
  end: DateTimeWithZone;
  locations?: CalendarEventLocation[];
  attendees?: CalendarEventAttendee[];
  status?: CalendarEventStatus | null;
  hosts?: CalendarEventHost[];
  calendarEventOwner?: { email: string; name?: string };
  source: CalendarSource;
}

/** API response wrapper for a single event. */
export interface GetUnifiedCalendarEventResponse {
  status: "success" | "error";
  data: UnifiedCalendarEvent;
}

/** API response wrapper for list events. */
export interface ListUnifiedCalendarEventsResponse {
  status: "success" | "error";
  data: UnifiedCalendarEvent[];
}

/** Input for creating an event. */
export interface CreateCalendarEventInput {
  title: string;
  start: DateTimeWithZone;
  end: DateTimeWithZone;
  description?: string | null;
  attendees?: Array<{ email: string; name?: string }>;
}

/** Input for updating an event (all fields optional). */
export interface UpdateCalendarEventInput {
  title?: string;
  start?: DateTimeWithZone;
  end?: DateTimeWithZone;
  description?: string | null;
  attendees?: CalendarEventAttendee[];
  status?: CalendarEventStatus | null;
}

/** Input for list events query. */
export interface ListCalendarEventsInput {
  from: string; // ISO date or date-time
  to: string;
  timeZone?: string;
  calendarId?: string; // default "primary"
}

/** Busy slot from free/busy API. */
export interface BusyTimeSlot {
  start: string; // ISO date-time
  end: string;
  source?: string | null;
}

/** API response for free/busy. */
export interface GetFreeBusyResponse {
  status: "success" | "error";
  data: BusyTimeSlot[];
}

/** Input for free/busy query. */
export interface GetFreeBusyInput {
  from: string;
  to: string;
  timeZone?: string;
}

/** Connected calendar (from GET /v2/calendars). */
export interface ConnectedCalendar {
  integration: {
    type: string;
    name: string;
    slug: string;
    variant: string;
    [key: string]: unknown;
  };
  credentialId: number;
  calendars?: Array<{
    externalId: string;
    name?: string;
    primary?: boolean | null;
    readOnly: boolean;
    isSelected: boolean;
    credentialId: number;
  }>;
  primary?: {
    externalId: string;
    primary: boolean | null;
    readOnly: boolean;
    isSelected: boolean;
    credentialId: number;
  };
  [key: string]: unknown;
}

/** Response from GET /v2/calendars. */
export interface GetCalendarsResponse {
  status: "success" | "error";
  data: {
    connectedCalendars: ConnectedCalendar[];
    destinationCalendar?: unknown;
  };
}

/** Single calendar connection (from GET /v2/calendars/connections). Use connectionId in connection-scoped endpoints. */
export interface CalendarConnection {
  connectionId: string;
  type: CalendarSource;
  email: string;
}

/** Response from GET /v2/calendars/connections. */
export interface ListConnectionsResponse {
  status: "success" | "error";
  data: {
    connections: CalendarConnection[];
  };
}

/** AgentCal client options. */
export interface AgentCalOptions {
  /** Cal.com API key (prefix with cal_) or access token. Preferred for server/agent use. */
  apiKey?: string;
  /** Cal.com OAuth access token. Use with token refresh for long-lived agents. */
  accessToken?: string;
  /** Base URL for the Cal.com API. Default: https://api.cal.com/v2 */
  baseUrl?: string;
  /** Custom fetch implementation (e.g. for testing or custom headers). */
  fetch?: typeof fetch;
  /** Max retries for transient failures. Default: 2 */
  maxRetries?: number;
}
