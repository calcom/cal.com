import type { CalendarAdapter } from "../calendar-adapter";
import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
  ICSFeedCalendarCredential,
} from "../calendar-adapter-types";
import { CalendarAdapterError } from "../lib/calendar-adapter-error";
import { expandVEventsFromICal } from "../lib/expand-recurring-events";

/**
 * ICS Feed calendar adapter.
 *
 * Read-only -- ICS feeds are static URLs that cannot be written to.
 * No optional methods. Write operations throw descriptive errors.
 *
 * Uses ical.js to parse ICS data from each configured feed URL.
 */
export class ICSFeedCalendarAdapter implements CalendarAdapter {
  private readonly key: { urls: string[] };

  constructor(credential: ICSFeedCalendarCredential) {
    this.key = credential.key;
  }

  // ---------------------------------------------------------------------------
  // Write operations -- always throw
  // ---------------------------------------------------------------------------

  async createEvent(_event: CalendarEventInput, _externalCalendarId?: string): Promise<CalendarEventResult> {
    throw new CalendarAdapterError({
      provider: "ICSFeed",
      message: "ICS feeds are read-only — createEvent is not supported",
      status: 405,
      transient: false,
    });
  }

  async updateEvent(
    _uid: string,
    _event: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<CalendarEventResult | CalendarEventResult[]> {
    throw new CalendarAdapterError({
      provider: "ICSFeed",
      message: "ICS feeds are read-only — updateEvent is not supported",
      status: 405,
      transient: false,
    });
  }

  async deleteEvent(
    _uid: string,
    _event?: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<void> {
    throw new CalendarAdapterError({
      provider: "ICSFeed",
      message: "ICS feeds are read-only — deleteEvent is not supported",
      status: 405,
      transient: false,
    });
  }

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    const dateFrom = new Date(params.dateFrom);
    const dateTo = new Date(params.dateTo);
    const busySlots: BusyTimeslot[] = [];

    const errors: CalendarAdapterError[] = [];

    for (const url of this.key.urls) {
      let response: Response;
      try {
        response = await fetch(url);
      } catch (error) {
        errors.push(
          new CalendarAdapterError({
            provider: "ICSFeed",
            message: `Failed to fetch ${url}: ${error instanceof Error ? error.message : "unknown error"}`,
            transient: true,
            cause: error,
          })
        );
        continue;
      }
      if (!response.ok) {
        errors.push(
          new CalendarAdapterError({
            provider: "ICSFeed",
            message: `Fetch ${url} returned HTTP ${response.status}`,
            status: response.status,
          })
        );
        continue;
      }

      const icsText = await response.text();
      const expanded = expandVEventsFromICal(icsText, dateFrom, dateTo);
      busySlots.push(...expanded);
    }

    for (const err of errors) {
      console.warn(err.message);
    }

    if (busySlots.length === 0 && errors.length === this.key.urls.length) {
      throw new CalendarAdapterError({
        provider: "ICSFeed",
        message: `All ${errors.length} feed(s) failed to fetch`,
        transient: true,
      });
    }

    return busySlots;
  }

  // ---------------------------------------------------------------------------
  // Calendar listing
  // ---------------------------------------------------------------------------

  async listCalendars(): Promise<CalendarInfo[]> {
    return this.key.urls.map((url, index) => ({
      externalId: url,
      name: `ICS Feed ${index + 1}`,
      integration: "ics_feed",
      primary: index === 0,
      readOnly: true,
    }));
  }
}
