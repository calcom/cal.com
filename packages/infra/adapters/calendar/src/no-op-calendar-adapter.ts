import type { CalendarAdapter } from "./calendar-adapter";
import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchEventsResult,
  FetchBusyTimesInput,
  HealthCheckResult,
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,
} from "./calendar-adapter-types";

/**
 * Null-object calendar adapter.
 *
 * Returns safe defaults for every operation. Useful for:
 * - Tests that need a calendar adapter but don't care about the results
 * - Fallback when no real adapter is configured
 * - Disabled calendar integrations
 */
export class NoOpCalendarAdapter implements CalendarAdapter {
  async createEvent(_event: CalendarEventInput, _externalCalendarId?: string): Promise<CalendarEventResult> {
    return {
      uid: "",
      id: "",
      type: "noop",
    };
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<CalendarEventResult | CalendarEventResult[]> {
    const result: CalendarEventResult = { uid, id: uid, type: "noop" };
    return event.recurringEvent ? [result] : result;
  }

  async deleteEvent(
    _uid: string,
    _event?: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<void> {}

  async fetchBusyTimes(_params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    return [];
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    return [];
  }

  async fetchEvents(): Promise<FetchEventsResult> {
    return { events: [], nextSyncToken: "", fullSyncRequired: false };
  }

  async subscribe(_input: SubscribeInput): Promise<SubscribeResult> {
    return { channelId: "" };
  }

  async unsubscribe(_input: UnsubscribeInput): Promise<void> {}

  async healthCheck(): Promise<HealthCheckResult> {
    return { valid: true };
  }
}
