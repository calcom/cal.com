import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import logger from "@calcom/lib/logger";

import type { CalendarSubscriptionEvent } from "../../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheEventService"] });

export class CalendarCacheEventService {
  constructor(
    private deps: {
      calendarCacheEventRepository?: ICalendarCacheEventRepository;
    }
  ) {}

  async handleEvents(calendarSubscriptionEvents: CalendarSubscriptionEvent[]) {
    log.debug("handleEvents", { calendarSubscriptionEvents });

    // const toDelete = calendarSubscriptionEvents.filter((event) => event.transparency === "transparent");
    // const toUpsert = calendarSubscriptionEvents.filter((event) => event.transparency === "opaque");

    // TODO
    // await this.deps.calendarCacheEventRepository?.createMany(toUpsert);
    // await this.deps.calendarCacheEventRepository?.deleteMany(toDelete);
  }
}
