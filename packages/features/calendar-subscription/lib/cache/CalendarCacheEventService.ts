import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type { CalendarCacheEvent, SelectedCalendar } from "@calcom/prisma/client";
import type {
  Calendar,
  CalendarEvent,
  CalendarServiceEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";

import type { CalendarSubscriptionEventItem } from "../../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheEventService"] });

/**
 * Service to handle calendar cache
 */
export class CalendarCacheEventService implements Calendar {
  constructor(
    private deps: {
      selectedCalendarRepository: SelectedCalendarRepository;
      calendarCacheEventRepository: ICalendarCacheEventRepository;
    }
  ) {}

  /**
   * Handle calendar events from provider and update the cache
   *
   * @param selectedCalendar
   * @param calendarSubscriptionEvents
   */
  async handleEvents(
    selectedCalendar: SelectedCalendar,
    calendarSubscriptionEvents: CalendarSubscriptionEventItem[]
  ): Promise<void> {
    log.debug("handleEvents", { count: calendarSubscriptionEvents.length });
    const toUpsert: Partial<CalendarCacheEvent>[] = [];
    const toDelete: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[] = [];

    for (const event of calendarSubscriptionEvents) {
      if (!event.id) {
        log.warn("handleEvents: skipping event with no ID", { event });
        continue;
      }

      if (event.busy) {
        toUpsert.push({
          externalId: event.id,
          selectedCalendarId: selectedCalendar.id,
          start: event.start,
          end: event.end,
          summary: event.summary,
          description: event.description,
          location: event.location,
          isAllDay: event.isAllDay,
          timeZone: event.timeZone,
          originalStartTime: event.originalStartDate,
          externalCreatedAt: event.createdAt,
          externalUpdatedAt: event.updatedAt,
        });
      } else {
        toDelete.push({
          selectedCalendarId: selectedCalendar.id,
          externalId: event.id,
        });
      }
    }

    log.debug("handleEvents: applying changes to the database", {
      received: calendarSubscriptionEvents.length,
      toUpsert: toUpsert.length,
      toDelete: toDelete.length,
    });
    await Promise.allSettled([
      this.deps.calendarCacheEventRepository.deleteMany(toDelete),
      this.deps.calendarCacheEventRepository.upsertMany(toUpsert),
    ]);
  }

  /**
   * Removes all events from the cache
   *
   * @param selectedCalendar calendar to cleanup
   */
  async cleanupCache(selectedCalendar: SelectedCalendar): Promise<void> {
    log.debug("cleanupCache", { selectedCalendarId: selectedCalendar.id });
    await this.deps.calendarCacheEventRepository.deleteAllBySelectedCalendarId(selectedCalendar.id);
  }

  /**
   *  Enriches a calendar with data from the cache
   *
   * @param selectedCalendarId calendar to enrich
   * @returns
   */
  async enrichCalendar<
    T extends {
      credentialId: number;
      calendars?: { externalId: string; name?: string }[];
    }
  >(
    calendars: T[]
  ): Promise<
    (T & {
      calendars?: ({ externalId: string; name?: string } & {
        syncedAt: Date | null;
      })[];
    })[]
  > {
    if (calendars.length === 0) {
      return [];
    }

    // Get all unique external IDs and credential IDs
    const calendarLookups = calendars.flatMap((cal) =>
      (cal.calendars || []).map((calendar) => ({
        externalId: calendar.externalId,
        credentialId: cal.credentialId,
      }))
    );

    // Find SelectedCalendar records in a single query
    const selectedCalendars = await this.deps.selectedCalendarRepository.findMany({
      where: {
        OR: calendarLookups.map(({ externalId, credentialId }) => ({
          externalId,
          credentialId,
        })),
      },
    });

    const selectedCalendarMap = new Map(
      selectedCalendars.map((selectedCalendar) => [
        `${selectedCalendar.externalId}_${selectedCalendar.credentialId}`,
        selectedCalendar.id,
      ])
    );

    const selectedCalendarIds = calendarLookups.map(({ externalId, credentialId }) => ({
      externalId,
      credentialId,
      selectedCalendarId: selectedCalendarMap.get(`${externalId}_${credentialId}`) || null,
    }));

    const cacheStatuses = selectedCalendars.map((selectedCalendar) => {
      return {
        selectedCalendarId: selectedCalendar.id,
        lastSyncAt: selectedCalendar.syncedAt,
      };
    });

    const cacheStatusMap = new Map(
      cacheStatuses.map((cache) => [cache.selectedCalendarId, { updatedAt: cache.lastSyncAt }])
    );

    // Create a map from externalId+credentialId to cache status
    const externalIdCredentialIdToCacheMap = new Map();
    selectedCalendarIds.forEach(({ externalId, credentialId, selectedCalendarId }) => {
      if (selectedCalendarId) {
        const cacheInfo = cacheStatusMap.get(selectedCalendarId);
        externalIdCredentialIdToCacheMap.set(`${externalId}_${credentialId}`, cacheInfo);
      }
    });

    return calendars.map((calendar) => {
      const enrichedCalendars = calendar.calendars?.map((cal) => {
        const cacheKey = `${cal.externalId}_${calendar.credentialId}`;
        const cacheInfo = externalIdCredentialIdToCacheMap.get(cacheKey);

        return {
          ...cal,
          syncedAt: cacheInfo?.updatedAt || null,
        };
      });

      return {
        ...calendar,
        calendars: enrichedCalendars,
      };
    });
  }

  getCredentialId?(): number {
    throw new Error("Method not implemented.");
  }
  createEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    throw new Error("Method not implemented.");
  }
  updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    throw new Error("Method not implemented.");
  }
  deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
  getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    shouldServeCache?: boolean,
    fallbackToPrimary?: boolean
  ): Promise<EventBusyDate[]> {
    throw new Error("Method not implemented.");
  }
  getAvailabilityWithTimeZones?(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[],
    fallbackToPrimary?: boolean
  ): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]> {
    throw new Error("Method not implemented.");
  }
  fetchAvailabilityAndSetCache?(selectedCalendars: IntegrationCalendar[]): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    throw new Error("Method not implemented.");
  }
  testDelegationCredentialSetup?(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  /**
   * Checks if the app is supported
   *
   * @param appId
   * @returns
   */
  static isAppSupported(appId: string | null): boolean {
    if (!appId) return false;
    return ["google-calendar", "office365-calendar"].includes(appId);
  }
}
