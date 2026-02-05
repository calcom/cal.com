import type { CalendarCacheEvent } from "@calcom/prisma/client";

/**
 * Repository to handle calendar cache
 */
export interface ICalendarCacheEventRepository {
  /**
   * Upserts many events
   * @param events the list of events to upsert
   */
  upsertMany(events: Partial<CalendarCacheEvent>[]): Promise<unknown>;

  /**
   * Deletes many events
   * @param events the list of events to delete
   */
  deleteMany(events: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]): Promise<unknown>;

  /**
   * Deletes all events for a selected calendar
   * @param selectedCalendarId the id of the calendar
   */
  deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<unknown>;

  /**
   * Deletes all stale events
   */
  deleteStale(): Promise<unknown>;

  /**
   *
   * @param selectedCalendarId
   * @param start
   * @param end
   */
  findAllBySelectedCalendarIdsBetween(
    selectedCalendarId: string[],
    start: Date,
    end: Date
  ): Promise<Pick<CalendarCacheEvent, "start" | "end" | "timeZone">[]>;
}
