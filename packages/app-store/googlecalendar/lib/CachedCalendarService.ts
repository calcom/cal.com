import { calendarCacheStore } from "@calcom/features/calendar-cache/calendar-cache-store";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["CachedCalendarService"] });

/**
 * CachedCalendarService implements the Calendar interface but only serves cached data.
 * It does not use the original calendar service internally.
 * This service should only be used when we have 100% cache hits for a user.
 */
export default class CachedCalendarService implements Calendar {
  credential: CredentialForCalendarService;

  constructor(credential: CredentialForCalendarService) {
    this.credential = credential;
  }

  getCredentialId(): number {
    return this.credential.id;
  }

  getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache = true,
    fallbackToPrimary = false
  ): Promise<EventBusyDate[]> {
    // Ensure userId is either a number or null, not undefined
    const userId: number | null =
      selectedCalendars.length > 0 && typeof selectedCalendars[0].userId === "number"
        ? selectedCalendars[0].userId
        : null;
    const credentialId = selectedCalendars.length > 0 ? selectedCalendars[0].credentialId || 0 : 0;

    if (!credentialId) {
      throw new Error("No credential ID found for calendar");
    }

    const items = selectedCalendars.map((cal) => ({ id: cal.externalId }));

    if (userId === undefined) {
      return Promise.resolve([]);
    }

    // Ensure userId is not undefined when passed to calendarCacheStore.get
    const cachedEntry = calendarCacheStore.get(credentialId, userId, dateFrom, dateTo, items);

    if (cachedEntry) {
      log.debug(`Cache hit for getAvailability [userId=${userId}, credentialId=${credentialId}]`);
      return Promise.resolve(cachedEntry.busyTimes);
    }

    log.error(`Cache miss in CachedCalendarService [userId=${userId}, credentialId=${credentialId}]`);
    return Promise.resolve([]);
  }

  createEvent(
    event: CalendarEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    throw new Error("CachedCalendarService does not support creating events");
  }

  updateEvent(
    uid: string,
    event: CalendarEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    throw new Error("CachedCalendarService does not support updating events");
  }

  deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    throw new Error("CachedCalendarService does not support deleting events");
  }

  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    throw new Error("CachedCalendarService does not support listing calendars");
  }

  getAvailabilityWithTimeZones(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    fallbackToPrimary?: boolean
  ): Promise<(EventBusyDate & { timeZone: string })[]> {
    // Ensure userId is either a number or null, not undefined
    const userId: number | null =
      selectedCalendars.length > 0 && typeof selectedCalendars[0].userId === "number"
        ? selectedCalendars[0].userId
        : null;
    const credentialId = selectedCalendars.length > 0 ? selectedCalendars[0].credentialId || 0 : 0;

    if (!credentialId) {
      throw new Error("No credential ID found for calendar");
    }

    const items = selectedCalendars.map((cal) => ({ id: cal.externalId }));

    if (userId === undefined) {
      return Promise.resolve([]);
    }

    // Ensure userId is not undefined when passed to calendarCacheStore.get
    const cachedEntry = calendarCacheStore.get(credentialId, userId, dateFrom, dateTo, items);

    if (cachedEntry) {
      log.debug(
        `Cache hit for getAvailabilityWithTimeZones [userId=${userId}, credentialId=${credentialId}]`
      );
      const busyTimes = cachedEntry.busyTimes.map((busyTime) => ({
        ...busyTime,
        timeZone: busyTime.timeZone || "UTC",
      }));
      return Promise.resolve(busyTimes);
    }

    log.error(`Cache miss in CachedCalendarService [userId=${userId}, credentialId=${credentialId}]`);
    return Promise.resolve([]);
  }

  testDelegationCredentialSetup?(): Promise<boolean> {
    return Promise.resolve(false);
  }

  fetchAvailabilityAndSetCache?(selectedCalendars: IntegrationCalendar[]): Promise<void> {
    return Promise.resolve();
  }

  watchCalendar?(options: { calendarId: string; eventTypeIds: (number | null)[] }): Promise<void> {
    return Promise.resolve();
  }

  unwatchCalendar?(options: { calendarId: string; eventTypeIds: (number | null)[] }): Promise<void> {
    return Promise.resolve();
  }
}
