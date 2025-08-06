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

import type {
  ICalendarEventRepository,
  CalendarEventForAvailability,
} from "./CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheService"] });

/**
 * Presenter for transforming calendar cache data into UI-friendly format.
 * This helps us ship less JavaScript to the client, prevent leaking sensitive properties,
 * and slim down the amount of data we're sending back to the client.
 */
class CalendarCachePresenter {
  /**
   * Transforms raw calendar events into EventBusyDate format for availability responses
   */
  static presentAvailabilityData(events: CalendarEventForAvailability[]): EventBusyDate[] {
    return events.map((event) => ({
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      source: "calendar-cache-sql",
      title: event.summary || "Busy",
    }));
  }

  /**
   * Transforms calendar IDs into a clean array format
   */
  static presentCalendarIds(selectedCalendars: IntegrationCalendar[]): string[] {
    return selectedCalendars.reduce<string[]>((acc, sc) => {
      if (sc.id !== undefined) {
        acc.push(sc.id);
      }
      return acc;
    }, []);
  }

  /**
   * Transforms subscription data into a clean array of IDs
   */
  static presentSubscriptionIds(subscriptions: Array<{ id: string }>): string[] {
    return subscriptions.map((subscription) => subscription.id);
  }
}

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

    // Use presenter to transform calendar IDs
    const selectedCalendarIds = CalendarCachePresenter.presentCalendarIds(selectedCalendars);

    // Batch fetch all subscriptions in a single query
    const subscriptions = await this.subscriptionRepo.findBySelectedCalendarIds(selectedCalendarIds);
    const subscriptionIds = CalendarCachePresenter.presentSubscriptionIds(subscriptions);

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

    // Use presenter to transform events to EventBusyDate format
    const results = CalendarCachePresenter.presentAvailabilityData(allEvents);

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
