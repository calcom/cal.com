import logger from "@calcom/lib/logger";
import type { Calendar } from "@calcom/types/Calendar";

import { watchCalendarSchema } from "./watchCalendarSchema";

export async function handleWatchCalendar(calendar: Calendar | null, externalId: string) {
  if (typeof calendar?.watchCalendar !== "function") {
    logger.info(
      '[handleWatchCalendar] Skipping watching calendar due to calendar not having "watchCalendar" method'
    );
    return;
  }
  const response = await calendar.watchCalendar({ calendarId: externalId });
  const parsedResponse = watchCalendarSchema.safeParse(response);
  if (!parsedResponse.success) {
    logger.info(
      "[handleWatchCalendar] Received invalid response from calendar.watchCalendar, skipping watching calendar"
    );
    return;
  }
  return parsedResponse.data;
}
