import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import logger from "@calcom/lib/logger";
import type { CalendarCacheEvent, SelectedCalendar } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["CalendarCacheEventService"] });

/**
 * Service to handle calendar cache
 */
export class CalendarCacheEventService {
  static MONTHS_AHEAD: number = 3;
  constructor(
    private deps: {
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
      // not storing free or cancelled events
      if (event.busy && event.status !== "cancelled") {
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
          recurringEventId: event.recurringEventId,
          externalEtag: event.etag || "",
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

    log.info("handleEvents: applying changes to the database", {
      received: calendarSubscriptionEvents.length,
      toUpsert: toUpsert.length,
      toDelete: toDelete.length,
    });
    await Promise.all([
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
   * Removes stale events from the cache
   */
  async cleanupStaleCache(): Promise<void> {
    log.debug("cleanupStaleCache");
    await this.deps.calendarCacheEventRepository.deleteStale();
  }

  /**
   * Checks if the app is supported
   *
   * @param type
   * @returns
   */
  static isCalendarTypeSupported(type: string | null): boolean {
    if (!type) return false;
    // return ["google_calendar", "office365_calendar"].includes(type);
    return ["google_calendar"].includes(type);
  }
}
