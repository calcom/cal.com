import type { CalendarCacheEvent } from "@calcom/prisma/client";

export interface ICalendarCacheEventRepository {
  createMany(events: CalendarCacheEvent[]): Promise<void>;
  deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void>;
}
