import type { CalendarCacheEvent } from "@calcom/prisma/client";

export interface ICalendarCacheEventRepository {
  upsertMany(events: Partial<CalendarCacheEvent>[]): Promise<void>;
  deleteMany(events: Pick<CalendarCacheEvent, "id">[]): Promise<void>;
  deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void>;
}
