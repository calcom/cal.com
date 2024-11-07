import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import logger from "@calcom/lib/logger";
import type { Calendar } from "@calcom/types/Calendar";

import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { watchCalendarSchema } from "./calendar-cache.repository.schema";

export class CalendarCacheRepository implements ICalendarCacheRepository {
  calendar: Calendar | null;
  constructor(calendar: Calendar | null = null) {
    this.calendar = calendar;
  }
  async getWatchedCalendar(credential: Parameters<typeof getCalendar>[0], calendarId: string) {
    const calendar = await getCalendar(credential);
    if (!calendar) return;
    return this.watchCalendar({ calendarId });
  }

  async watchCalendar(args: { calendarId: string }) {
    const { calendarId } = args;
    if (typeof this.calendar?.watchCalendar !== "function") {
      logger.info(
        '[handleWatchCalendar] Skipping watching calendar due to calendar not having "watchCalendar" method'
      );
      return;
    }
    const response = await this.calendar?.watchCalendar({ calendarId });
    const parsedResponse = watchCalendarSchema.safeParse(response);
    if (!parsedResponse.success) {
      logger.info(
        "[handleWatchCalendar] Received invalid response from calendar.watchCalendar, skipping watching calendar"
      );
      return;
    }

    return parsedResponse.data;
  }

  async unwatchCalendar(args: { calendarId: string }) {
    const { calendarId } = args;
    if (typeof this.calendar?.unwatchCalendar !== "function") {
      logger.info(
        '[handleWatchCalendar] Skipping watching calendar due to calendar not having "watchCalendar" method'
      );
      return;
    }
    const response = await this.calendar?.unwatchCalendar({ calendarId });
    const parsedResponse = watchCalendarSchema.safeParse(response);
    if (!parsedResponse.success) {
      logger.info(
        "[handleWatchCalendar] Received invalid response from calendar.watchCalendar, skipping watching calendar"
      );
      return;
    }

    return parsedResponse.data;
  }
}
