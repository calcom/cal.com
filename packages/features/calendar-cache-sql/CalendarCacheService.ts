import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  Calendar,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CalendarServiceEvent, CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheService"] });

export class CalendarCacheService implements Calendar {
  constructor(
    private credential: CredentialForCalendarService,
    private subscriptionRepo: ICalendarSubscriptionRepository,
    private eventRepo: ICalendarEventRepository
  ) {}

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean,
    fallbackToPrimary?: boolean
  ): Promise<EventBusyDate[]> {
    log.debug("Getting availability from cache", safeStringify({ dateFrom, dateTo, selectedCalendars }));

    if (selectedCalendars.length === 0) {
      return [];
    }

    // Batch fetch all subscriptions in a single query
    const selectedCalendarIds = selectedCalendars.reduce<string[]>((acc, sc) => {
      if (sc.id !== undefined) {
        acc.push(sc.id);
      }
      return acc;
    }, []);
    const subscriptions = await this.subscriptionRepo.findBySelectedCalendarIds(selectedCalendarIds);
    const subscriptionIds = subscriptions.map((subscription) => subscription.id);

    if (subscriptionIds.length === 0) {
      log.debug("No subscriptions found, returning empty results");
      return [];
    }

    // Batch fetch all events in a single query
    const allEvents = await this.eventRepo.getEventsForAvailabilityBatch(
      subscriptionIds,
      new Date(dateFrom),
      new Date(dateTo)
    );

    // Convert all events to EventBusyDate format
    const results = allEvents.map((event) => ({
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      source: "calendar-cache-sql",
    }));

    log.debug(`Returning ${results.length} busy dates from cache`);
    return results;
  }

  // Implement other Calendar interface methods with appropriate fallbacks or empty implementations
  async createEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    throw new Error("CalendarCacheService does not support creating events");
  }

  async updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    throw new Error("CalendarCacheService does not support updating events");
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    throw new Error("CalendarCacheService does not support deleting events");
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    // Return empty array since we don't have access to external calendar list
    return [];
  }

  getCredentialId?(): number {
    return this.credential.id;
  }
}
