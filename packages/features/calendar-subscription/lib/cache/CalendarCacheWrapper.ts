import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  CalendarServiceEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendarEventTypeIds,
} from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["CachedCalendarWrapper"] });

/**
 * A wrapper to load cache from database and cache it.
 *
 * @see Calendar
 */
export class CalendarCacheWrapper implements Calendar {
  constructor(
    private deps: {
      originalCalendar: Calendar;
      calendarCacheEventRepository: ICalendarCacheEventRepository;
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
   * Retrieves availability combining cache and live sources.
   *
   * - Calendars **with** both `syncToken` and `syncSubscribedAt` → fetched from cache.
   * - Calendars **without** one of them → fetched directly from the original calendar.
   * - Results are merged into a single array.
   *
   * @param dateFrom - Start date (ISO string)
   * @param dateTo - End date (ISO string)
   * @param selectedCalendars - List of calendars to retrieve availability from
   * @returns Combined array of busy date ranges
   */
  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    log.debug("getAvailability (mixed cache + original)", {
      dateFrom,
      dateTo,
      calendarIds: selectedCalendars.map((c) => c.id),
      calendarCount: selectedCalendars.length,
    });

    if (!selectedCalendars?.length) return [];

    const withSync = selectedCalendars.filter((c) => c.syncToken && c.syncSubscribedAt);
    const withoutSync = selectedCalendars.filter((c) => !c.syncToken || !c.syncSubscribedAt);

    const results: EventBusyDate[] = [];

    // Fetch from cache for synced calendars
    if (withSync.length) {
      const ids = withSync.map((c) => c.id).filter((id): id is string => Boolean(id));
      const cached = await this.deps.calendarCacheEventRepository.findAllBySelectedCalendarIdsBetween(
        ids,
        new Date(dateFrom),
        new Date(dateTo)
      );
      results.push(...cached);
    }

    // Fetch from original calendar for unsynced ones
    if (withoutSync.length) {
      const original = await this.deps.originalCalendar.getAvailability(dateFrom, dateTo, withoutSync);
      results.push(...original);
    }

    return results;
  }

  /**
   * Retrieves availability with time zones, combining cache and live data.
   *
   * - Calendars **with** both `syncToken` and `syncSubscribedAt` → fetched from cache.
   * - Calendars **without** one of them → fetched directly from the original calendar.
   * - Results are merged into a single array with `{ start, end, timeZone }` format.
   *
   * @param dateFrom - Start date (ISO string)
   * @param dateTo - End date (ISO string)
   * @param selectedCalendars - List of calendars to retrieve availability from
   * @returns Combined array of time-zone-aware availability ranges
   */
  async getAvailabilityWithTimeZones(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]> {
    log.debug("getAvailabilityWithTimeZones (mixed cache + original)", {
      dateFrom,
      dateTo,
      calendarIds: selectedCalendars.map((c) => c.id),
      calendarCount: selectedCalendars.length,
    });

    if (!selectedCalendars?.length) return [];

    const withSync = selectedCalendars.filter((c) => c.syncToken && c.syncSubscribedAt);
    const withoutSync = selectedCalendars.filter((c) => !c.syncToken || !c.syncSubscribedAt);

    const results: { start: Date | string; end: Date | string; timeZone: string }[] = [];

    // Fetch from cache for synced calendars
    if (withSync.length) {
      const ids = withSync.map((c) => c.id).filter((id): id is string => Boolean(id));
      const cached = await this.deps.calendarCacheEventRepository.findAllBySelectedCalendarIdsBetween(
        ids,
        new Date(dateFrom),
        new Date(dateTo)
      );
      results.push(
        ...cached.map(({ start, end, timeZone }) => ({
          start,
          end,
          timeZone: timeZone || "UTC",
        }))
      );
    }

    // Fetch from original calendar for unsynced ones
    if (withoutSync.length) {
      const original = await this.deps.originalCalendar.getAvailabilityWithTimeZones?.(
        dateFrom,
        dateTo,
        withoutSync
      );
      if (original?.length) results.push(...original);
    }

    return results;
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
