import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type { CalendarCacheEvent, SelectedCalendar } from "@calcom/prisma/client";

import type { CalendarSubscriptionEventItem } from "../../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheEventService"] });

export class CalendarCacheEventService {
  constructor(
    private deps: {
      selectedCalendarRepository: SelectedCalendarRepository;
      calendarCacheEventRepository: ICalendarCacheEventRepository;
    }
  ) {}

  async handleEvents(
    selectedCalendar: SelectedCalendar,
    calendarSubscriptionEvents: CalendarSubscriptionEventItem[]
  ): Promise<void> {
    log.debug("handleEvents", { count: calendarSubscriptionEvents.length });
    const toUpsert: Partial<CalendarCacheEvent>[] = [];
    const toDelete: { selectedCalendarId: string; externalEventId: string }[] = [];
    for (const event of calendarSubscriptionEvents) {
      if (!event.id) {
        log.warn("handleEvents: skipping event with no ID", { event });
        continue;
      }

      if (event.busy) {
        toUpsert.push({
          selectedCalendarId: selectedCalendar.id,
          start: event.start,
          end: event.end,
          externalEventId: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
        });
      } else {
        toDelete.push({
          selectedCalendarId: selectedCalendar.id,
          externalEventId: event.id,
        });
      }
    }

    log.debug("handleEvents: applying changes to the database", {
      received: calendarSubscriptionEvents.length,
      toUpsert: toUpsert.length,
      toDelete: toDelete.length,
    });
    await Promise.all([
      this.deps.calendarCacheEventRepository.deleteMany(toDelete),
      this.deps.calendarCacheEventRepository.upsertMany(toUpsert),
    ]);
  }

  async cleanupCache(selectedCalendar: SelectedCalendar): Promise<void> {
    log.debug("cleanupCache", { selectedCalendarId: selectedCalendar.id });
    await this.deps.calendarCacheEventRepository.deleteAllBySelectedCalendarId(selectedCalendar.id);
  }
}
