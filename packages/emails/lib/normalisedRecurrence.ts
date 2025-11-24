import { recurringEventSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

export default function normalisedRecurrence(calEvent: CalendarEvent): CalendarEvent {
  if (calEvent.recurringEvent) {
    const parsedRecurringEvent = recurringEventSchema.safeParse(calEvent.recurringEvent);
    if (!parsedRecurringEvent.success) {
      throw new Error("RecurringEvent is invalid");
    }
    const { freq, interval, count } = parsedRecurringEvent.data;
    if (count == null) {
      throw new Error("RecurringEvent.count is required but missing in RRULE");
    }

    return {
      ...calEvent,
      recurringEvent: {
        freq,
        interval,
        count,
      },
    };
  }
  return calEvent;
}
