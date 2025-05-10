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
 * @implements {Calendar}
 */
export class CachedCalendarService implements Calendar {
  credential: CredentialForCalendarService;
  id: number;

  constructor(credential: CredentialForCalendarService) {
    this.credential = credential;
    this.id = credential.id;
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
    // Ensure userId is always a number or null, never undefined
    const userId: number | null =
      selectedCalendars.length > 0 &&
      selectedCalendars[0].userId !== undefined &&
      selectedCalendars[0].userId !== null
        ? selectedCalendars[0].userId
        : null;
    const credentialId: number = this.credential.id;

    // Ensure we have a valid credentialId
    if (credentialId === 0 || credentialId === undefined) {
      throw new Error("No valid credential ID found for calendar");
    }

    if (!credentialId) {
      throw new Error("No credential ID found for calendar");
    }

    const items = selectedCalendars.map((cal) => ({ id: cal.externalId }));

    // Ensure userId is never undefined when passed to calendarCacheStore.get
    // Ensure userId is always a number or null before passing to calendarCacheStore.get
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
    fallbackToPrimary = false
  ): Promise<(EventBusyDate & { timeZone: string })[]> {
    // Ensure userId is always a number or null, never undefined
    const userId: number | null =
      selectedCalendars.length > 0 &&
      selectedCalendars[0].userId !== undefined &&
      selectedCalendars[0].userId !== null
        ? selectedCalendars[0].userId
        : null;
    const credentialId: number = this.credential.id;

    // Ensure we have a valid credentialId
    if (credentialId === 0 || credentialId === undefined) {
      throw new Error("No valid credential ID found for calendar");
    }

    if (!credentialId) {
      throw new Error("No credential ID found for calendar");
    }

    const items = selectedCalendars.map((cal) => ({ id: cal.externalId }));

    // Ensure userId is never undefined when passed to calendarCacheStore.get
    // Ensure userId is always a number or null before passing to calendarCacheStore.get
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
