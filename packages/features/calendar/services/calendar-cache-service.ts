import type { CalendarAdapter } from "@calcom/calendar-adapter/calendar-adapter";
import type { CalendarEvent } from "@calcom/calendar-adapter/calendar-adapter-types";
import type { CalendarCacheEventRepository } from "@calcom/features/calendar/repositories/calendar-cache-event-repository";
import logger from "@calcom/lib/logger";
import type { CalendarCacheEvent, SelectedCalendar } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["CalendarCacheService"] });

const DEFAULT_STALE_SYNC_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_CACHE_RANGE_MONTHS = 3;

export class CalendarCacheService {
  constructor(
    private deps: {
      cacheRepo: CalendarCacheEventRepository;
      config?: {
        staleSyncThresholdMs?: number;
        maxCacheRangeMonths?: number;
      };
    }
  ) {}

  private get staleSyncThresholdMs(): number {
    return this.deps.config?.staleSyncThresholdMs ?? DEFAULT_STALE_SYNC_THRESHOLD_MS;
  }

  private get maxCacheRangeMonths(): number {
    return this.deps.config?.maxCacheRangeMonths ?? DEFAULT_MAX_CACHE_RANGE_MONTHS;
  }

  async fetchBusyTimesWithCache(params: {
    adapter: CalendarAdapter;
    selectedCalendars: SelectedCalendar[];
    dateFrom: string;
    dateTo: string;
  }): Promise<Array<{ start: Date; end: Date; timeZone: string | null }>> {
    const { adapter, selectedCalendars, dateFrom, dateTo } = params;
    const now = Date.now();
    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    if (selectedCalendars.length === 0) {
      return [];
    }

    const monthsSpan = (end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsSpan > this.maxCacheRangeMonths) {
      log.info("fetchBusyTimesWithCache", {
        totalCalendars: selectedCalendars.length,
        freshFromCache: 0,
        staleFromAdapter: selectedCalendars.length,
        bypassedCache: true,
      });

      const busyTimes = await adapter.fetchBusyTimes({
        dateFrom,
        dateTo,
        calendars: selectedCalendars.map((c) => ({
          externalId: c.externalId,
          integration: c.integration,
          credentialId: c.credentialId,
        })),
      });
      return busyTimes.map((bt) => ({ start: bt.start, end: bt.end, timeZone: bt.timeZone ?? null }));
    }

    const freshCalendarIds: string[] = [];
    const staleCalendars: SelectedCalendar[] = [];

    for (const cal of selectedCalendars) {
      if (cal.syncedAt && now - cal.syncedAt.getTime() < this.staleSyncThresholdMs) {
        freshCalendarIds.push(cal.id);
      } else {
        staleCalendars.push(cal);
      }
    }

    log.info("fetchBusyTimesWithCache", {
      totalCalendars: selectedCalendars.length,
      freshFromCache: freshCalendarIds.length,
      staleFromAdapter: staleCalendars.length,
      bypassedCache: false,
    });

    const results: Array<{ start: Date; end: Date; timeZone: string | null }> = [];

    let cachedResultCount = 0;
    if (freshCalendarIds.length > 0) {
      const cached = await this.deps.cacheRepo.findBusyTimesBetween(freshCalendarIds, start, end);
      cachedResultCount = cached.length;
      results.push(...cached);
    }

    let adapterResultCount = 0;
    if (staleCalendars.length > 0) {
      try {
        const busyTimes = await adapter.fetchBusyTimes({
          dateFrom,
          dateTo,
          calendars: staleCalendars.map((c) => ({
            externalId: c.externalId,
            integration: c.integration,
            credentialId: c.credentialId,
          })),
        });

        adapterResultCount = busyTimes.length;
        for (const bt of busyTimes) {
          results.push({
            start: new Date(bt.start),
            end: new Date(bt.end),
            timeZone: bt.timeZone ?? null,
          });
        }
      } catch (err) {
        // Intentionally swallowed: if the adapter fails for stale calendars we still
        // return whatever we got from the cache (fresh calendars). This is a graceful
        // degradation — a partial result is better than failing the entire availability check.
        log.error("Failed to fetch busy times for stale calendars from adapter", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    log.info("fetchBusyTimesWithCache: results", {
      cachedEvents: cachedResultCount,
      adapterEvents: adapterResultCount,
      totalBusySlots: results.length,
    });

    return results;
  }

  /**
   * Fetch busy times from the cache DB only — no adapter calls.
   * Used by CalendarService for calendars that are confirmed fresh,
   * so adapter errors are handled in CalendarService where the
   * circuit breaker and credential invalidation logic live.
   */
  async fetchFromCache(params: {
    selectedCalendarIds: string[];
    dateFrom: Date;
    dateTo: Date;
  }): Promise<Array<{ start: Date; end: Date; timeZone: string | null }>> {
    const { selectedCalendarIds, dateFrom, dateTo } = params;
    if (selectedCalendarIds.length === 0) return [];
    return this.deps.cacheRepo.findBusyTimesBetween(selectedCalendarIds, dateFrom, dateTo);
  }

  async handleEvents(
    selectedCalendar: Pick<SelectedCalendar, "id" | "externalId">,
    events: CalendarEvent[]
  ): Promise<void> {
    log.info("handleEvents", {
      selectedCalendarId: selectedCalendar.id,
      count: events.length,
    });

    const toUpsert: Partial<CalendarCacheEvent>[] = [];
    const toDelete: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[] = [];

    for (const event of events) {
      if (event.status !== "cancelled") {
        toUpsert.push({
          externalId: event.uid,
          selectedCalendarId: selectedCalendar.id,
          iCalUID: event.iCalUID ?? null,
          iCalSequence: event.iCalSequence ?? 0,
          start: event.start,
          end: event.end,
          summary: event.title ?? null,
          description: event.description ?? null,
          location: event.location ?? null,
          isAllDay: event.isAllDay ?? false,
          timeZone: event.timeZone ?? null,
          originalStartTime: event.originalStartTime ?? null,
          recurringEventId: event.recurringEventId ?? null,
          externalEtag: event.etag ?? "",
          status: event.status as CalendarCacheEvent["status"],
        });
      } else {
        toDelete.push({
          selectedCalendarId: selectedCalendar.id,
          externalId: event.uid,
        });
      }
    }

    log.info("handleEvents: applying changes", {
      received: events.length,
      toUpsert: toUpsert.length,
      toDelete: toDelete.length,
    });

    // Run upsert and delete independently so one failure doesn't block the other.
    // This is cache-only data — failures are self-healing on the next sync cycle:
    //   - Failed delete: a cancelled event temporarily shows as busy until next sync
    //   - Failed upsert: cache stays stale, next fetch falls through to the adapter
    // No manual intervention required; log.warn for visibility without triggering alerts.
    const [deleteResult, upsertResult] = await Promise.allSettled([
      this.deps.cacheRepo.deleteMany(toDelete),
      this.deps.cacheRepo.upsertMany(toUpsert),
    ]);

    if (deleteResult.status === "rejected") {
      log.warn("handleEvents: deleteMany failed (self-healing on next sync)", {
        selectedCalendarId: selectedCalendar.id,
        error:
          deleteResult.reason instanceof Error ? deleteResult.reason.message : String(deleteResult.reason),
      });
    }

    if (upsertResult.status === "rejected") {
      log.warn("handleEvents: upsertMany failed (self-healing on next sync)", {
        selectedCalendarId: selectedCalendar.id,
        error:
          upsertResult.reason instanceof Error ? upsertResult.reason.message : String(upsertResult.reason),
      });
    }
  }

  async cleanupCache(selectedCalendarId: string): Promise<void> {
    log.info("cleanupCache", { selectedCalendarId });
    await this.deps.cacheRepo.deleteAllBySelectedCalendarId(selectedCalendarId);
  }

  async cleanupStaleCache(): Promise<void> {
    log.info("cleanupStaleCache");
    await this.deps.cacheRepo.deleteStale();
  }
}
