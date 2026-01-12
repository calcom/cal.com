import logger from "@calcom/lib/logger";
import { withSpan } from "@calcom/lib/sentryWrapper";
import type {
  Calendar,
  CalendarEvent,
  CalendarServiceEvent,
  EventBusyDate,
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["CalendarTelemetryWrapper"] });

/**
 * A wrapper to add telemetry to all calendar services.
 * This provides consistent metrics for comparing performance between cached and non-cached calendar loading.
 *
 * @see Calendar
 */
export class CalendarTelemetryWrapper implements Calendar {
  constructor(
    private deps: {
      originalCalendar: Calendar;
      calendarType: string;
      cacheSupported: boolean;
      cacheEnabled: boolean;
      credentialId: number;
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

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    return withSpan(
      {
        name: "CalendarTelemetryWrapper.getAvailability",
        op: "calendar.getAvailability",
        attributes: {
          credentialId: this.deps.credentialId,
          calendarCount: selectedCalendars?.length ?? 0,
          calendarType: this.deps.calendarType,
          cacheSupported: this.deps.cacheSupported,
          cacheEnabled: this.deps.cacheEnabled,
        },
      },
      async (span) => {
        log.debug("getAvailability", {
          dateFrom,
          dateTo,
          calendarCount: selectedCalendars.length,
          cacheSupported: this.deps.cacheSupported,
          cacheEnabled: this.deps.cacheEnabled,
        });

        if (!selectedCalendars?.length) return [];

        const startTime = performance.now();
        const results = await this.deps.originalCalendar.getAvailability({
          dateFrom,
          dateTo,
          selectedCalendars,
          mode: params.mode,
          fallbackToPrimary: params.fallbackToPrimary,
        });
        const totalFetchDurationMs = performance.now() - startTime;

        span.setAttribute("totalFetchDurationMs", totalFetchDurationMs);
        span.setAttribute("totalEventsCount", results.length);

        log.info("Calendar fetch completed", {
          calendarCount: selectedCalendars.length,
          totalFetchDurationMs,
          totalEventsCount: results.length,
          cacheSupported: this.deps.cacheSupported,
          cacheEnabled: this.deps.cacheEnabled,
        });

        return results;
      }
    );
  }

  async getAvailabilityWithTimeZones(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    // Check if the original calendar supports this method
    if (!this.deps.originalCalendar.getAvailabilityWithTimeZones) {
      return [];
    }

    return withSpan(
      {
        name: "CalendarTelemetryWrapper.getAvailabilityWithTimeZones",
        op: "calendar.getAvailabilityWithTimeZones",
        attributes: {
          credentialId: this.deps.credentialId,
          calendarCount: selectedCalendars?.length ?? 0,
          calendarType: this.deps.calendarType,
          cacheSupported: this.deps.cacheSupported,
          cacheEnabled: this.deps.cacheEnabled,
        },
      },
      async (span) => {
        log.debug("getAvailabilityWithTimeZones", {
          dateFrom,
          dateTo,
          calendarCount: selectedCalendars.length,
          cacheSupported: this.deps.cacheSupported,
          cacheEnabled: this.deps.cacheEnabled,
        });

        if (!selectedCalendars?.length) return [];

        const startTime = performance.now();
        const results = await this.deps.originalCalendar.getAvailabilityWithTimeZones?.({
          dateFrom,
          dateTo,
          selectedCalendars,
          mode: params.mode,
          fallbackToPrimary: params.fallbackToPrimary,
        });
        const totalFetchDurationMs = performance.now() - startTime;

        span.setAttribute("totalFetchDurationMs", totalFetchDurationMs);
        span.setAttribute("totalEventsCount", results?.length ?? 0);

        log.info("Calendar fetch with timezones completed", {
          calendarCount: selectedCalendars.length,
          totalFetchDurationMs,
          totalEventsCount: results?.length ?? 0,
          cacheSupported: this.deps.cacheSupported,
          cacheEnabled: this.deps.cacheEnabled,
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
}
