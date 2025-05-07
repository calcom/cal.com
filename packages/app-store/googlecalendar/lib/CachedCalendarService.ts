import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
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

export default class CachedCalendarService implements Calendar {
  private originalCalendarService: Calendar;

  constructor(credential: CredentialForCalendarService) {
    this.originalCalendarService = {} as Calendar;

    (async () => {
      const calendar = await getCalendar(credential);
      if (!calendar) {
        throw new Error(`Failed to get calendar for credential type: ${credential.type}`);
      }
      this.originalCalendarService = calendar;
    })();
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache = true,
    fallbackToPrimary = false
  ): Promise<EventBusyDate[]> {
    if (!shouldServeCache) {
      return this.originalCalendarService.getAvailability(
        dateFrom,
        dateTo,
        selectedCalendars,
        shouldServeCache,
        fallbackToPrimary
      );
    }

    const userId = selectedCalendars.length > 0 ? selectedCalendars[0].userId : null;
    const credentialId = selectedCalendars.length > 0 ? selectedCalendars[0].credentialId || 0 : 0;

    if (!credentialId) {
      return this.originalCalendarService.getAvailability(
        dateFrom,
        dateTo,
        selectedCalendars,
        shouldServeCache,
        fallbackToPrimary
      );
    }

    const items = selectedCalendars.map((cal) => ({ id: cal.externalId }));

    const cachedEntry = calendarCacheStore.get(credentialId, userId || null, dateFrom, dateTo, items);

    if (cachedEntry) {
      log.debug(`Cache hit for getAvailability [userId=${userId}, credentialId=${credentialId}]`);
      return cachedEntry.busyTimes;
    }

    log.debug(`Cache miss for getAvailability [userId=${userId}, credentialId=${credentialId}]`);
    const busyTimes = await this.originalCalendarService.getAvailability(
      dateFrom,
      dateTo,
      selectedCalendars,
      shouldServeCache,
      fallbackToPrimary
    );

    calendarCacheStore.set({
      userId: userId || 0,
      credentialId,
      timeMin: dateFrom,
      timeMax: dateTo,
      items,
      busyTimes,
    });

    return busyTimes;
  }

  async createEvent(
    event: CalendarEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    return this.originalCalendarService.createEvent(event, credentialId, externalCalendarId);
  }

  async updateEvent(
    uid: string,
    event: CalendarEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    return this.originalCalendarService.updateEvent(uid, event, externalCalendarId);
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    return this.originalCalendarService.deleteEvent(uid, event, externalCalendarId);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return this.originalCalendarService.listCalendars(event);
  }

  async getAvailabilityWithTimeZones?(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    fallbackToPrimary?: boolean
  ) {
    if (this.originalCalendarService.getAvailabilityWithTimeZones) {
      return this.originalCalendarService.getAvailabilityWithTimeZones(
        dateFrom,
        dateTo,
        selectedCalendars,
        fallbackToPrimary
      );
    }
    return Promise.resolve([]);
  }

  async testDelegationCredentialSetup?() {
    if (this.originalCalendarService.testDelegationCredentialSetup) {
      return this.originalCalendarService.testDelegationCredentialSetup();
    }
    return Promise.resolve(false);
  }

  async fetchAvailabilityAndSetCache?(selectedCalendars: IntegrationCalendar[]) {
    if (this.originalCalendarService.fetchAvailabilityAndSetCache) {
      return this.originalCalendarService.fetchAvailabilityAndSetCache(selectedCalendars);
    }
    return Promise.resolve();
  }

  async watchCalendar?(options: { calendarId: string; eventTypeIds: (number | null)[] }) {
    if (this.originalCalendarService.watchCalendar) {
      return this.originalCalendarService.watchCalendar(options);
    }
    return Promise.resolve();
  }

  async unwatchCalendar?(options: { calendarId: string; eventTypeIds: (number | null)[] }) {
    if (this.originalCalendarService.unwatchCalendar) {
      return this.originalCalendarService.unwatchCalendar(options);
    }
    return Promise.resolve();
  }
}
