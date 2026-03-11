import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  CalendarServiceEvent,
  EventBusyDate,
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import { metrics } from "@sentry/nextjs";

const log = logger.getSubLogger({ prefix: ["CachedCalendarWrapper"] });

export class CalendarCacheWrapper implements Calendar {
  static STALE_SYNC_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
  static MAX_CACHE_RANGE_MONTHS = 3;

  constructor(
    private deps: {
      originalCalendar: Calendar;
      calendarCacheEventRepository: ICalendarCacheEventRepository;
      onDemandSync?: (calendarId: string) => Promise<void>;
    }
  ) {}

  getCredentialId?(): number {
    return this.deps.originalCalendar.getCredentialId ? this.deps.originalCalendar.getCredentialId() : -1;
  }

  createEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType> {
    return this.deps.originalCalendar.createEvent(event, credentialId, externalCalendarId);
  }

  updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string | null
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    return this.deps.originalCalendar.updateEvent(uid, event, externalCalendarId);
  }

  deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string | null): Promise<unknown> {
    return this.deps.originalCalendar.deleteEvent(uid, event, externalCalendarId);
  }

  /**
   * Returns true when dateTo exceeds the cache's reliable range.
   * Far-future queries bypass the cache because it may not have
   * complete event data beyond this horizon.
   */
  private isDateRangeBeyondCacheLimit(dateTo: string): boolean {
    const requestedEnd = new Date(dateTo);
    const cacheLimit = new Date();
    cacheLimit.setMonth(cacheLimit.getMonth() + CalendarCacheWrapper.MAX_CACHE_RANGE_MONTHS);
    return requestedEnd > cacheLimit;
  }

  private isStale(calendar: IntegrationCalendar): boolean {
    if (!calendar.syncedAt) return false;
    const syncAge = Date.now() - new Date(calendar.syncedAt).getTime();
    return syncAge > CalendarCacheWrapper.STALE_SYNC_THRESHOLD_MS;
  }

  /**
   * Fire-and-forget background sync for stale calendars.
   * Does not block the availability response.
   */
  private triggerBackgroundSync(staleCalendars: IntegrationCalendar[]): void {
    if (!this.deps.onDemandSync) return;

    const ids = staleCalendars.map((c) => c.id).filter((id): id is string => Boolean(id));
    if (!ids.length) return;

    log.info("Triggering background sync for stale calendars", { calendarIds: ids });
    metrics.count("calendar.cache.stale_sync.triggered", ids.length);

    for (const id of ids) {
      this.deps.onDemandSync(id).catch((err) => {
        log.warn("Background stale sync failed", {
          calendarId: id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        metrics.count("calendar.cache.stale_sync.error", 1);
      });
    }
  }

  /**
   * Splits synced calendars into fresh (serve from cache) and stale (fallback to original).
   * Stale calendars trigger a background sync to fix the cache for the next request.
   */
  private splitByFreshness(calendars: IntegrationCalendar[]): {
    fresh: IntegrationCalendar[];
    stale: IntegrationCalendar[];
  } {
    const fresh: IntegrationCalendar[] = [];
    const stale: IntegrationCalendar[] = [];

    for (const c of calendars) {
      if (this.isStale(c)) {
        stale.push(c);
      } else {
        fresh.push(c);
      }
    }

    if (stale.length) {
      this.triggerBackgroundSync(stale);
    }

    return { fresh, stale };
  }

  /**
   * Retrieves availability combining cache and live sources.
   *
   * - Calendars **with** both `syncToken` and `syncSubscribedAt` and fresh `syncedAt` → fetched from cache.
   * - Calendars **without** sync data or with stale `syncedAt` → fetched directly from the original calendar.
   * - Stale calendars trigger a background sync to fix the cache for subsequent requests.
   * - Results are merged into a single array.
   */
  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;

    log.debug("getAvailability (mixed cache + original)", {
      dateFrom,
      dateTo,
      calendarIds: selectedCalendars.map((c) => c.id),
      calendarCount: selectedCalendars.length,
    });

    if (!selectedCalendars?.length) return [];

    if (this.isDateRangeBeyondCacheLimit(dateTo)) {
      log.debug("Date range exceeds cache limit, falling back to original calendar", {
        dateTo,
        maxCacheRangeMonths: CalendarCacheWrapper.MAX_CACHE_RANGE_MONTHS,
      });
      metrics.count("calendar.cache.bypass.date_range_exceeded", 1);
      return this.deps.originalCalendar.getAvailability(params);
    }

    const synced = selectedCalendars.filter((c) => c.syncToken && c.syncSubscribedAt);
    const unsynced = selectedCalendars.filter((c) => !c.syncToken || !c.syncSubscribedAt);

    const { fresh: withSync, stale } = this.splitByFreshness(synced);
    const withoutSync = [...unsynced, ...stale];

    const results: EventBusyDate[] = [];

    // ===== CACHE PATH =====
    if (withSync.length) {
      const cacheStartTime = performance.now();

      const ids = withSync.map((c) => c.id).filter((id): id is string => Boolean(id));
      const cached = await this.deps.calendarCacheEventRepository.findAllBySelectedCalendarIdsBetween(
        ids,
        new Date(dateFrom),
        new Date(dateTo)
      );

      const cacheDurationMs = performance.now() - cacheStartTime;

      results.push(
        ...cached.map((event) => ({
          ...event,
          timeZone: event.timeZone ?? undefined,
        }))
      );

      metrics.count("calendar.cache.hit.calls", 1);
      metrics.distribution("calendar.cache.hit.duration_ms", cacheDurationMs);
      metrics.distribution("calendar.cache.hit.events_count", cached.length);

      log.debug("Calendar cache fetch completed", {
        cachedCalendarCount: withSync.length,
        cacheFetchDurationMs: cacheDurationMs,
        cachedEventsCount: cached.length,
      });
    }

    // ===== ORIGINAL PATH =====
    if (withoutSync.length) {
      const originalStartTime = performance.now();

      const original = await this.deps.originalCalendar.getAvailability({
        dateFrom,
        dateTo,
        selectedCalendars: withoutSync,
        mode: params.mode,
        fallbackToPrimary: params.fallbackToPrimary,
      });

      const originalDurationMs = performance.now() - originalStartTime;

      results.push(...original);

      metrics.count("calendar.cache.miss.calls", 1);
      metrics.distribution("calendar.cache.miss.duration_ms", originalDurationMs);
      metrics.distribution("calendar.cache.miss.events_count", original.length);

      log.debug("Original calendar fetch completed", {
        originalCalendarCount: withoutSync.length,
        originalFetchDurationMs: originalDurationMs,
        originalEventsCount: original.length,
      });
    }

    metrics.distribution("calendar.getAvailability.total_events_count", results.length);

    return results;
  }

  /**
   * Retrieves availability with time zones, combining cache and live data.
   *
   * - Calendars **with** both `syncToken` and `syncSubscribedAt` and fresh `syncedAt` → fetched from cache.
   * - Calendars **without** sync data or with stale `syncedAt` → fetched directly from the original calendar.
   * - Stale calendars trigger a background sync to fix the cache for subsequent requests.
   * - Results are merged into a single array with `{ start, end, timeZone }` format.
   */
  async getAvailabilityWithTimeZones(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;

    log.debug("getAvailabilityWithTimeZones (mixed cache + original)", {
      dateFrom,
      dateTo,
      calendarIds: selectedCalendars.map((c) => c.id),
      calendarCount: selectedCalendars.length,
    });

    if (!selectedCalendars?.length) return [];

    if (this.isDateRangeBeyondCacheLimit(dateTo)) {
      log.debug("Date range exceeds cache limit, falling back to original calendar (withTimeZones)", {
        dateTo,
        maxCacheRangeMonths: CalendarCacheWrapper.MAX_CACHE_RANGE_MONTHS,
      });
      metrics.count("calendar.cache.bypass.date_range_exceeded.timezone", 1);
      return (await this.deps.originalCalendar.getAvailabilityWithTimeZones?.(params)) ?? [];
    }

    const synced = selectedCalendars.filter((c) => c.syncToken && c.syncSubscribedAt);
    const unsynced = selectedCalendars.filter((c) => !c.syncToken || !c.syncSubscribedAt);

    const { fresh: withSync, stale } = this.splitByFreshness(synced);
    const withoutSync = [...unsynced, ...stale];

    const results: EventBusyDate[] = [];

    if (withSync.length) {
      const cacheStartTime = performance.now();

      const ids = withSync.map((c) => c.id).filter((id): id is string => Boolean(id));
      const cached = await this.deps.calendarCacheEventRepository.findAllBySelectedCalendarIdsBetween(
        ids,
        new Date(dateFrom),
        new Date(dateTo)
      );

      const cacheDurationMs = performance.now() - cacheStartTime;

      results.push(
        ...cached.map(({ start, end, timeZone }) => ({
          start,
          end,
          timeZone: timeZone || "UTC",
        }))
      );

      metrics.count("calendar.cache.hit.timezone.calls", 1);
      metrics.distribution("calendar.cache.hit.timezone.duration_ms", cacheDurationMs);
      metrics.distribution("calendar.cache.hit.timezone.events_count", cached.length);
    }

    if (withoutSync.length) {
      const originalStartTime = performance.now();

      const original = await this.deps.originalCalendar.getAvailabilityWithTimeZones?.({
        dateFrom,
        dateTo,
        selectedCalendars: withoutSync,
        mode: params.mode,
        fallbackToPrimary: params.fallbackToPrimary,
      });

      const originalDurationMs = performance.now() - originalStartTime;

      if (original?.length) results.push(...original);

      metrics.count("calendar.cache.miss.timezone.calls", 1);
      metrics.distribution("calendar.cache.miss.timezone.duration_ms", originalDurationMs);
      metrics.distribution("calendar.cache.miss.timezone.events_count", original?.length ?? 0);
    }

    metrics.distribution("calendar.getAvailabilityWithTimeZones.total_events_count", results.length);

    return results;
  }

  fetchAvailabilityAndSetCache?(selectedCalendars: IntegrationCalendar[]): Promise<unknown> {
    return this.deps.originalCalendar.fetchAvailabilityAndSetCache?.(selectedCalendars) || Promise.resolve();
  }

  listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return this.deps.originalCalendar.listCalendars(event);
  }

  testDelegationCredentialSetup?(): Promise<void> {
    return this.deps.originalCalendar.testDelegationCredentialSetup?.() || Promise.resolve();
  }
}
