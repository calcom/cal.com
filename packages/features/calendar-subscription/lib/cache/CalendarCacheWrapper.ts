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
   * Override this method to use cache
   *
   * @param dateFrom
   * @param dateTo
   * @param selectedCalendars
   * @param shouldServeCache
   */
  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
    // _shouldServeCache?: boolean
    // _fallbackToPrimary?: boolean
  ): Promise<EventBusyDate[]> {
    log.debug("getAvailability from cache", { dateFrom, dateTo, selectedCalendars });
    const selectedCalendarIds = selectedCalendars.map((e) => e.id).filter((id): id is string => Boolean(id));
    if (!selectedCalendarIds.length) {
      return Promise.resolve([]);
    }
    return this.deps.calendarCacheEventRepository.findAllBySelectedCalendarIdsBetween(
      selectedCalendarIds,
      new Date(dateFrom),
      new Date(dateTo)
    );
  }

  /**
   * Override this method to use cache
   *
   * @param dateFrom
   * @param dateTo
   * @param selectedCalendars
   * @returns
   */
  async getAvailabilityWithTimeZones?(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
    // _fallbackToPrimary?: boolean
  ): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]> {
    log.debug("getAvailabilityWithTimeZones from cache", { dateFrom, dateTo, selectedCalendars });
    const selectedCalendarIds = selectedCalendars.map((e) => e.id).filter((id): id is string => Boolean(id));
    const result = await this.deps.calendarCacheEventRepository.findAllBySelectedCalendarIdsBetween(
      selectedCalendarIds,
      new Date(dateFrom),
      new Date(dateTo)
    );
    return result.map(({ start, end, timeZone }) => ({ start, end, timeZone: timeZone || "UTC" }));
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
