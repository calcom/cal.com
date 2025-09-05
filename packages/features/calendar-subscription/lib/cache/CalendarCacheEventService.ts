import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type { SelectedCalendar } from "@calcom/prisma/client";

import type { CalendarSubscriptionEventItem } from "../../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheEventService"] });

export class CalendarCacheEventService {
  constructor(
    private deps: {
      selectedCalendarRepository: SelectedCalendarRepository;
      calendarCacheEventRepository: ICalendarCacheEventRepository;
    }
  ) {}

  async handleEvents(calendarSubscriptionEvents: CalendarSubscriptionEventItem[]) {
    log.debug("handleEvents", { calendarSubscriptionEvents });

    const toDelete = calendarSubscriptionEvents.filter((event) => event.transparency === "transparent");
    const toUpsert = calendarSubscriptionEvents.filter((event) => event.transparency === "opaque");

    await this.deps.calendarCacheEventRepository.createMany(toUpsert);
    await this.deps.calendarCacheEventRepository.deleteMany(toDelete);
  }

  async cleanupCache(selectedCalendar: SelectedCalendar) {
    log.debug("cleanupCache", { selectedCalendar });
    await this.deps.calendarCacheEventRepository?.deleteAllBySelectedCalendarId(selectedCalendar.id);
  }
}
