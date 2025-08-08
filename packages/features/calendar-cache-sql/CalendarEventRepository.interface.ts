import type { Prisma, CalendarEvent } from "@prisma/client";

// Minimal fields needed for availability calculations
export type CalendarEventForAvailability = Pick<
  CalendarEvent,
  "start" | "end" | "summary" | "calendarSubscriptionId"
>;

// Minimal fields returned by upsertEvent for performance optimization
export type CalendarEventUpsertResult = Pick<
  CalendarEvent,
  "id" | "googleEventId" | "etag" | "start" | "end" | "summary" | "status" | "updatedAt"
>;

export interface ICalendarEventRepository {
  upsertEvent(
    data: Prisma.CalendarEventCreateInput,
    subscriptionId: string
  ): Promise<CalendarEventUpsertResult>;
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
  bulkUpsertEvents(
    events: Prisma.CalendarEventCreateInput[],
    subscriptionId: string,
    people?: {
      creator?: { email?: string | null; displayName?: string | null; isSelf?: boolean };
      organizer?: { email?: string | null; displayName?: string | null; isSelf?: boolean };
      attendees?: Array<{
        email?: string | null;
        displayName?: string | null;
        responseStatus?: string | null;
        isOrganizer?: boolean;
        isSelf?: boolean;
      }>;
    }
  ): Promise<void>;
  cleanupOldEvents(): Promise<void>;
}
