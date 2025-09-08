import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type { CalendarCacheEvent, SelectedCalendar } from "@calcom/prisma/client";

import type {
  CalendarCredential,
  CalendarSubscriptionEventItem,
} from "../../lib/CalendarSubscriptionPort.interface";

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
    credential: CalendarCredential,
    calendarSubscriptionEvents: CalendarSubscriptionEventItem[]
  ): Promise<void> {
    log.debug("handleEvents", { count: calendarSubscriptionEvents.length });
    const toUpsert: Partial<CalendarCacheEvent>[] = [];
    const toDelete: Partial<CalendarCacheEvent>[] = [];
    for (const event of calendarSubscriptionEvents) {
      if (event.transparency === "opaque") {
        toUpsert.push({
          selectedCalendarId: selectedCalendar.id,
        });
      } else if (event.transparency === "transparent") {
        toDelete.push({
          selectedCalendarId: selectedCalendar.id,
        });
      } else {
        log.warn("handleEvents: ignoring unknown transparency", { transparency: event.transparency });
      }
    }

    log.debug("handleEvents: applying changes to the database", {
      received: calendarSubscriptionEvents.length,
      toUpsert: toUpsert.length,
      toDelete: toDelete.length,
    });
    await Promise.all([
      // this.deps.calendarCacheEventRepository.deleteManyBy(toDelete),
      // this.deps.calendarCacheEventRepository.upsertMany(toUpsert),
    ]);
  }

  async cleanupCache(selectedCalendar: SelectedCalendar): Promise<void> {
    log.debug("cleanupCache", { selectedCalendarId: selectedCalendar.id });
    await this.deps.calendarCacheEventRepository.deleteAllBySelectedCalendarId(selectedCalendar.id);
  }
}
