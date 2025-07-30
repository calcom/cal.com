import type { Prisma, CalendarEvent } from "@prisma/client";

export interface ICalendarEventRepository {
  upsertEvent(data: Prisma.CalendarEventCreateInput, subscriptionId: string): Promise<CalendarEvent>;
  getEventsForAvailability(calendarSubscriptionId: string, start: Date, end: Date): Promise<CalendarEvent[]>;
  deleteEvent(calendarSubscriptionId: string, googleEventId: string): Promise<void>;
  bulkUpsertEvents(events: Prisma.CalendarEventCreateInput[], subscriptionId: string): Promise<void>;
  cleanupOldEvents(): Promise<void>;
}
