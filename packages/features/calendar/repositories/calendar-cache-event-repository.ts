import type { CalendarCacheEvent } from "@calcom/prisma/client";

export interface CalendarCacheEventRepository {
  upsertMany(events: Partial<CalendarCacheEvent>[]): Promise<void>;
  deleteMany(events: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]): Promise<void>;
  deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void>;
  deleteStale(): Promise<void>;
  findBusyTimesBetween(
    selectedCalendarIds: string[],
    start: Date,
    end: Date
  ): Promise<Array<{ start: Date; end: Date; timeZone: string | null }>>;
}
