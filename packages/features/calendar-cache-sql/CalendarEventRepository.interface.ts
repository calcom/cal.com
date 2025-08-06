import type { Prisma, CalendarEvent } from "@prisma/client";

// Minimal fields needed for availability calculations
export type CalendarEventForAvailability = Pick<CalendarEvent, "start" | "end" | "summary">;

export interface ICalendarEventRepository {
  upsertEvent(data: Prisma.CalendarEventCreateInput, subscriptionId: string): Promise<CalendarEvent>;
  getEventsForAvailability(
    calendarSubscriptionId: string,
    start: Date,
    end: Date
  ): Promise<CalendarEventForAvailability[]>;
  getEventsForAvailabilityBatch(
    subscriptionIds: string[],
    start: Date,
    end: Date
  ): Promise<CalendarEventForAvailability[]>;
  deleteEvent(calendarSubscriptionId: string, googleEventId: string): Promise<void>;
  bulkUpsertEvents(events: Prisma.CalendarEventCreateInput[], subscriptionId: string): Promise<void>;
  cleanupOldEvents(): Promise<void>;
}
