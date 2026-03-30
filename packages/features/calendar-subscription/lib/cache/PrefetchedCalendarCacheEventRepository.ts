import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import type { CalendarCacheEvent } from "@calcom/prisma/client";

type CachedEvent = Pick<CalendarCacheEvent, "start" | "end" | "timeZone" | "selectedCalendarId">;

/**
 * In-memory implementation of ICalendarCacheEventRepository that serves
 * pre-fetched CalendarCacheEvents from a Map. Used for batch prefetching
 * to eliminate N+1 queries when computing availability for many users.
 *
 * Write operations are no-ops since this is a read-only snapshot.
 */
export class PrefetchedCalendarCacheEventRepository implements ICalendarCacheEventRepository {
  private eventsByCalendarId: Map<string, CachedEvent[]>;

  private groupEventsByCalendarId({ events }: { events: CachedEvent[] }): Map<string, CachedEvent[]> {
    const eventsByCalendarId = new Map<string, CachedEvent[]>();
    for (const event of events) {
      const existing = eventsByCalendarId.get(event.selectedCalendarId);
      if (existing) {
        existing.push(event);
      } else {
        eventsByCalendarId.set(event.selectedCalendarId, [event]);
      }
    }
    return eventsByCalendarId;
  }

  constructor(events: CachedEvent[]) {
    this.eventsByCalendarId = this.groupEventsByCalendarId({ events });
  }

  async findAllBySelectedCalendarIdsBetween(
    selectedCalendarIds: string[],
    start: Date,
    end: Date
  ): Promise<CachedEvent[]> {
    return selectedCalendarIds.flatMap((id) => {
      const events = this.eventsByCalendarId.get(id) ?? [];
      return events.filter((e) => e.start < end && e.end > start);
    });
  }

  // Write operations are no-ops — this is a read-only snapshot
  async upsertMany(_events: CachedEvent[]): Promise<void> {}
  async deleteMany(_events: Pick<CachedEvent, "selectedCalendarId">[]): Promise<void> {}
  async deleteAllBySelectedCalendarId(_selectedCalendarId: string): Promise<void> {}
  async deleteStale(): Promise<void> {}
}
