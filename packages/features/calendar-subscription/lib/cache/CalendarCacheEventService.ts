import logger from "@calcom/lib/logger";

import type { CalendarSubscriptionEvent } from "../../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheEventService"] });

export class CalendarCacheEventService {
  async handleEvents(calendarSubscriptionEvents: CalendarSubscriptionEvent[]) {
    log.debug("handleEvents", { calendarSubscriptionEvents });
  }
}
