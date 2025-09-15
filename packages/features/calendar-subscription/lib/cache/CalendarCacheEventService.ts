import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type { CalendarCacheEvent, SelectedCalendar } from "@calcom/prisma/client";

import type { CalendarSubscriptionEventItem } from "../../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheEventService"] });

/**
 * Service to handle calendar cache
 */
export class CalendarCacheEventService {
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
  async enrichCalendar({ selectedCalendarId }: { selectedCalendarId: string }): Promise<void> {
    log.debug("enrichCalendar", { selectedCalendarId });

    const selectedCalendar = await this.deps.selectedCalendarRepository.findById(selectedCalendarId);
    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }
  }
}
