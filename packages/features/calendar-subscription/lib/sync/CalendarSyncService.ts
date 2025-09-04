import type { CalendarSubscriptionEvent } from "calendar-subscription/lib/CalendarSubscriptionPort.interface";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["CalendarSyncService"] });

export class CalendarSyncService {
  async handleEvents(selectedCalendarId: string, calendarSubscriptionEvents: CalendarSubscriptionEvent[]) {
    log.debug("handleEvents", { calendarSubscriptionEvents });
    // TODO update bookings based on events
  }
}
