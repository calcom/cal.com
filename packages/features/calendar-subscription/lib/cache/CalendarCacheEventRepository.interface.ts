import type { CalendarCacheEvent } from "@calcom/prisma/client";

export interface ICalendarCacheEventRepository {
  upsertMany(events: Partial<CalendarCacheEvent>[]): Promise<void>;
  deleteMany(events: Pick<CalendarCacheEvent, "externalEventId" | "selectedCalendarId">[]): Promise<void>;
  deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void>;
}
