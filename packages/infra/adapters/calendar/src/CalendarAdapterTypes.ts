/**
 * Core types for calendar adapters.
 *
 * Self-contained — no dependencies on @calcom/types, Prisma, or any
 * other Cal.com package. The bridge layer maps between these and
 * legacy types.
 */

// ---------------------------------------------------------------------------
// Busy time
// ---------------------------------------------------------------------------

export interface BusyTimeslot {
  start: Date;
  end: Date;
  title?: string;
  source?: string | null;
  userId?: number | null;
  timeZone?: string;
}

// ---------------------------------------------------------------------------
// Credential — named types per provider, union for consumers
// ---------------------------------------------------------------------------

export interface GoogleCalendarCredential {
  id: number;
  type: "google_calendar";
  key: {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expiry_date?: number;
  };
}

export interface Office365CalendarCredential {
  id: number;
  type: "office365_calendar";
  key: {
    access_token: string;
    email?: string;
    scope?: string;
    token_type?: string;
    expiry_date?: number;
  };
}

export interface CalDAVCalendarCredential {
  id: number;
  type: "caldav_calendar";
  key: {
    username: string;
    password: string;
    url: string;
  };
}

export interface AppleCalendarCredential {
  id: number;
  type: "apple_calendar";
  key: {
    username: string;
    password: string;
    url?: string;
  };
}

export interface ExchangeCalendarCredential {
  id: number;
  type: "exchange_calendar";
  key: {
    username: string;
    password: string;
    url: string;
    exchangeVersion: string;
    authenticationMethod: "NTLM" | "Basic";
    /** Allow self-signed SSL certificates (enterprise deployments). Defaults to false. */
    allowSelfSignedCerts?: boolean;
  };
}

export interface FeishuCalendarCredential {
  id: number;
  type: "feishu_calendar";
  key: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
    refresh_expires_date: number;
  };
}

export interface LarkCalendarCredential {
  id: number;
  type: "lark_calendar";
  key: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
    refresh_expires_date: number;
  };
}

export interface ZohoCalendarCredential {
  id: number;
  type: "zoho_calendar";
  key: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    server_location: string;
  };
}

export interface ProtonCalendarCredential {
  id: number;
  type: "proton_calendar";
  key: {
    username: string;
    password: string;
    url?: string;
  };
}

export interface ICSFeedCalendarCredential {
  id: number;
  type: "ics_feed_calendar";
  key: {
    urls: string[];
  };
}

export type CalendarCredential =
  | GoogleCalendarCredential
  | Office365CalendarCredential
  | CalDAVCalendarCredential
  | AppleCalendarCredential
  | ExchangeCalendarCredential
  | FeishuCalendarCredential
  | LarkCalendarCredential
  | ZohoCalendarCredential
  | ProtonCalendarCredential
  | ICSFeedCalendarCredential;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface CalendarEventInput {
  title: string;
  startTime: Date;
  endTime: Date;
  /** Unique identifier for idempotent operations */
  uid?: string;
  description?: string;
  /** Provider-formatted description (may differ from description) */
  calendarDescription?: string;
  location?: string;
  attendees?: CalendarAttendee[];
  organizer?: CalendarAttendee;
  timeZone?: string;
  /** Recurrence rules for repeating events */
  recurringEvent?: RecurrenceRule;
  /** Video conferencing data (Google Meet, Zoom, etc.) */
  conferenceData?: ConferenceData;
  /** Calendar-native visibility: service maps hideCalendarEventDetails → "private" */
  visibility?: "default" | "public" | "private" | "confidential";
  /** Whether attendees can see each other (service maps seatsPerTimeSlot to this) */
  guestsCanSeeOtherGuests?: boolean;
  /** Whether attendees can modify the event */
  guestsCanModify?: boolean;
  /** Reminder overrides — provider-specific rendering */
  reminders?: CalendarReminder[];
  /** Event status */
  status?: "confirmed" | "tentative" | "cancelled";
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  timeZone?: string;
  locale?: string;
  /** Provider-native response status */
  responseStatus?: "needsAction" | "accepted" | "declined" | "tentative";
  /** Whether attendance is optional */
  optional?: boolean;
}

export interface CalendarReminder {
  method: "popup" | "email";
  minutes: number;
}

export interface RecurrenceRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number;
  count?: number;
  until?: Date;
  /** Start date of the recurrence (affects multi-day recurring events) */
  dtstart?: Date;
  /** IANA timezone for DST-aware recurrence calculation */
  tzid?: string;
}

export interface ConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: {
      type: string;
    };
  };
  entryPoints?: Array<{
    entryPointType: string;
    uri: string;
    label?: string;
  }>;
}

export interface CalendarEventResult {
  uid: string;
  id: string;
  type: string;
  url?: string;
  iCalUID?: string | null;
  additionalInfo?: Record<string, unknown>;
  /** For recurring events: the provider's recurring event series ID */
  thirdPartyRecurringEventId?: string | null;
  /** Password for password-protected events (e.g., Zoom) */
  password?: string | null;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export interface FetchBusyTimesInput {
  dateFrom: string;
  dateTo: string;
  calendars: CalendarReference[];
  /** Max events per page. Provider may cap this. */
  maxResults?: number;
  /** Pagination token from a previous response */
  pageToken?: string;
}

export interface CalendarReference {
  externalId: string;
  integration: string;
  credentialId?: number | null;
}

// ---------------------------------------------------------------------------
// Calendar listing
// ---------------------------------------------------------------------------

export interface CalendarInfo {
  externalId: string;
  name?: string;
  integration: string;
  primary?: boolean;
  readOnly?: boolean;
  email?: string;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export interface FetchEventsInput {
  calendarId: string;
  /** null or omitted = full sync, present = incremental sync */
  syncToken?: string | null;
  /** Date range for full sync (ignored when syncToken is present) */
  dateFrom?: string;
  dateTo?: string;
  /** Max events per page. Provider may cap this. */
  maxResults?: number;
  /** Pagination token from a previous response */
  pageToken?: string;
}

export interface FetchEventsResult {
  events: CalendarEvent[];
  /** Token for the next incremental sync call */
  nextSyncToken: string;
  /** Provider signaled that a full sync is required (e.g. sync token expired) */
  fullSyncRequired: boolean;
  /** Present when there are more pages — pass to next fetchEvents call */
  nextPageToken?: string;
}

export interface CalendarEvent {
  uid: string;
  title?: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  status: "confirmed" | "tentative" | "cancelled";
  timeZone?: string;
  iCalUID?: string | null;
  /** RFC 5545 sequence number — used for sync conflict detection */
  iCalSequence?: number;
  /** Provider's ETag — used for efficient sync (CalDAV, Google) */
  etag?: string;
  /** Provider's recurring event series ID */
  recurringEventId?: string | null;
  /** Original start time for recurring event instances */
  originalStartTime?: Date | null;
  /** Calendar ID that this event belongs to */
  source?: string;
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export interface SubscribeInput {
  calendarId: string;
  webhookUrl: string;
  /** Opaque token forwarded back in push notifications for validation */
  webhookToken?: string;
  /** Desired TTL in seconds. The provider may cap this. */
  ttlSeconds?: number;
}

export interface SubscribeResult {
  channelId: string;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: Date | null;
}

export interface UnsubscribeInput {
  channelId: string;
  resourceId?: string | null;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthCheckResult {
  valid: boolean;
  /** Present when valid = false */
  reason?: "invalid_grant" | "token_expired" | "account_suspended" | "unknown";
}
