import logger from "@calcom/lib/logger";
import { withSpan } from "@calcom/lib/sentryWrapper";
import type {
  Calendar,
  CalendarEvent,
  CalendarServiceEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendarEventTypeIds,
} from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["CalendarTelemetryWrapper"] });

/**
 * A wrapper to add telemetry to calendar services when cache is disabled.
 * This allows comparing performance between cached and non-cached calendar loading.
 *
 * @see Calendar
 */
export class CalendarTelemetryWrapper implements Calendar {
  constructor(
    private deps: {
      originalCalendar: Calendar;
      calendarType: string;
    }
  ) {}

  getCredentialId?(): number {
    return this.deps.originalCalendar.getCredentialId ? this.deps.originalCalendar.getCredentialId() : -1;
  }

  createEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    return this.deps.originalCalendar.createEvent(event, credentialId, externalCalendarId);
  }

  updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    return this.deps.originalCalendar.updateEvent(uid, event, externalCalendarId);
  }

  deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    return this.deps.originalCalendar.deleteEvent(uid, event, externalCalendarId);
  }

  /**
   * Retrieves availability with telemetry tracking when cache is disabled.
   *
   * @param dateFrom - Start date (ISO string)
   * @param dateTo - End date (ISO string)
   * @param selectedCalendars - List of calendars to retrieve availability from
   * @returns Array of busy date ranges
   */
  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return withSpan(
      {
        name: "CalendarTelemetryWrapper.getAvailability",
        op: "calendar.cache.getAvailability",
        attributes: {
          calendarCount: selectedCalendars?.length ?? 0,
          calendarType: this.deps.calendarType,
          cacheEnabled: false,
          cacheSupported: true,
        },
      },
      async (span) => {
        log.debug("getAvailability (cache disabled)", {
          dateFrom,
          dateTo,
          calendarIds: selectedCalendars.map((c) => c.id),
          calendarCount: selectedCalendars.length,
        });

        if (!selectedCalendars?.length) return [];

        const startTime = performance.now();
        const results = await this.deps.originalCalendar.getAvailability(dateFrom, dateTo, selectedCalendars);
        const durationMs = performance.now() - startTime;

        span.setAttribute("originalCalendarCount", selectedCalendars.length);
        span.setAttribute("originalFetchDurationMs", durationMs);
        span.setAttribute("originalEventsCount", results.length);
        span.setAttribute("cacheUsed", false);
        span.setAttribute("totalEventsCount", results.length);

        log.info("Calendar fetch completed (cache disabled)", {
          calendarCount: selectedCalendars.length,
          fetchDurationMs: durationMs,
          eventsCount: results.length,
        });

        return results;
      }
    );
  }

  /**
   * Retrieves availability with time zones and telemetry tracking when cache is disabled.
   *
   * @param dateFrom - Start date (ISO string)
   * @param dateTo - End date (ISO string)
   * @param selectedCalendars - List of calendars to retrieve availability from
   * @returns Array of time-zone-aware availability ranges
   */
  async getAvailabilityWithTimeZones(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]> {
    // Check if the original calendar supports this method
    if (!this.deps.originalCalendar.getAvailabilityWithTimeZones) {
      return [];
    }

    return withSpan(
      {
        name: "CalendarTelemetryWrapper.getAvailabilityWithTimeZones",
        op: "calendar.cache.getAvailabilityWithTimeZones",
        attributes: {
          calendarCount: selectedCalendars?.length ?? 0,
          calendarType: this.deps.calendarType,
          cacheEnabled: false,
          cacheSupported: true,
        },
      },
      async (span) => {
        log.debug("getAvailabilityWithTimeZones (cache disabled)", {
          dateFrom,
          dateTo,
          calendarIds: selectedCalendars.map((c) => c.id),
          calendarCount: selectedCalendars.length,
        });

        if (!selectedCalendars?.length) return [];

        const startTime = performance.now();
        const results = await this.deps.originalCalendar.getAvailabilityWithTimeZones?.(
          dateFrom,
          dateTo,
          selectedCalendars
        );
        const durationMs = performance.now() - startTime;

        span.setAttribute("originalCalendarCount", selectedCalendars.length);
        span.setAttribute("originalFetchDurationMs", durationMs);
        span.setAttribute("originalEventsCount", results?.length ?? 0);
        span.setAttribute("cacheUsed", false);
        span.setAttribute("totalEventsCount", results?.length ?? 0);

        log.info("Calendar fetch with timezones completed (cache disabled)", {
          calendarCount: selectedCalendars.length,
          fetchDurationMs: durationMs,
          eventsCount: results?.length ?? 0,
        });

        return results ?? [];
      }
    );
  }

  fetchAvailabilityAndSetCache?(selectedCalendars: IntegrationCalendar[]): Promise<unknown> {
    return this.deps.originalCalendar.fetchAvailabilityAndSetCache?.(selectedCalendars) || Promise.resolve();
  }

  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return this.deps.originalCalendar.listCalendars(event);
  }

  testDelegationCredentialSetup?(): Promise<boolean> {
    return this.deps.originalCalendar.testDelegationCredentialSetup?.() || Promise.resolve(false);
  }

  watchCalendar?(options: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }): Promise<unknown> {
    return this.deps.originalCalendar.watchCalendar?.(options) || Promise.resolve();
  }

  unwatchCalendar?(options: {
    calendarId: string;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }): Promise<void> {
    return this.deps.originalCalendar.unwatchCalendar?.(options) || Promise.resolve();
  }
}
