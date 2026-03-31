import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchEventsInput,
  FetchEventsResult,
  FetchBusyTimesInput,
  HealthCheckResult,
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,
} from "./calendar-adapter-types";

/**
 * Technology-agnostic calendar adapter interface.
 *
 * Every calendar provider (Google, Office365, CalDAV, …) implements this
 * interface. The adapter sits behind a service layer and is the only
 * code that knows about the provider's SDK / API.
 *
 * Optional methods indicate provider capabilities — consumers check
 * for method existence before calling:
 *
 * ```ts
 * if (adapter.subscribe) {
 *   await adapter.subscribe(input);
 * }
 * ```
 */
export interface CalendarAdapter {
  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  createEvent(event: CalendarEventInput, externalCalendarId?: string): Promise<CalendarEventResult>;

  updateEvent(
    uid: string,
    event: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<CalendarEventResult | CalendarEventResult[]>;

  deleteEvent(uid: string, event?: CalendarEventInput, externalCalendarId?: string | null): Promise<void>;

  // -----------------------------------------------------------------------
  // Read
  // -----------------------------------------------------------------------

  /**
   * Providers that support timezone-aware responses (e.g. Google) should
   * populate BusyTimeslot.timeZone — consumers filter by its presence
   * instead of calling a separate method.
   */
  fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]>;

  listCalendars(): Promise<CalendarInfo[]>;

  // -----------------------------------------------------------------------
  // Sync (optional — provider supports incremental event sync)
  // -----------------------------------------------------------------------

  /** Fetch full events with sync token for incremental sync */
  fetchEvents?(params: FetchEventsInput): Promise<FetchEventsResult>;

  // -----------------------------------------------------------------------
  // Subscription (optional — provider supports push notifications)
  // -----------------------------------------------------------------------

  /** Register a push subscription for real-time event notifications */
  subscribe?(input: SubscribeInput): Promise<SubscribeResult>;

  /** Cancel a push subscription */
  unsubscribe?(input: UnsubscribeInput): Promise<void>;

  // -----------------------------------------------------------------------
  // Health (optional — provider supports token validation)
  // -----------------------------------------------------------------------

  /** Lightweight check that the underlying token is still valid */
  healthCheck?(): Promise<HealthCheckResult>;
}
