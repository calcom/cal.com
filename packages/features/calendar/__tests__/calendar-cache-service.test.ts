import type { CalendarAdapter } from "@calcom/calendar-adapter/calendar-adapter";
import type { CalendarEvent } from "@calcom/calendar-adapter/calendar-adapter-types";
import type { CalendarCacheEventRepository } from "@calcom/features/calendar/repositories/calendar-cache-event-repository";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalendarCacheService } from "../services/calendar-cache-service";

// ---------------------------------------------------------------------------
// Logger mock — capture error/debug/info calls for verification
// ---------------------------------------------------------------------------

const { mockLogError, mockLogWarn, mockLogDebug, mockLogInfo } = vi.hoisted(() => ({
  mockLogError: vi.fn(),
  mockLogWarn: vi.fn(),
  mockLogDebug: vi.fn(),
  mockLogInfo: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      error: mockLogError,
      warn: mockLogWarn,
      debug: mockLogDebug,
      info: mockLogInfo,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCacheRepo(): CalendarCacheEventRepository {
  return {
    upsertMany: vi.fn().mockResolvedValue(undefined),
    deleteMany: vi.fn().mockResolvedValue(undefined),
    deleteAllBySelectedCalendarId: vi.fn().mockResolvedValue(undefined),
    deleteStale: vi.fn().mockResolvedValue(undefined),
    findBusyTimesBetween: vi.fn().mockResolvedValue([]),
  };
}

function makeAdapter(overrides: Partial<CalendarAdapter> = {}): CalendarAdapter {
  return {
    fetchBusyTimes: vi.fn().mockResolvedValue([]),
    createEvent: vi.fn().mockResolvedValue({ uid: "uid", id: "id", type: "google_calendar" }),
    updateEvent: vi.fn().mockResolvedValue({ uid: "uid", id: "id", type: "google_calendar" }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    listCalendars: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeSelectedCalendar(overrides: Partial<SelectedCalendar> = {}): SelectedCalendar {
  return {
    id: "sc-1",
    externalId: "ext-1",
    integration: "google_calendar",
    credentialId: 1,
    userId: 1,
    delegationCredentialId: null,
    channelId: null,
    channelResourceId: null,
    channelResourceUri: null,
    channelKind: null,
    channelExpiration: null,
    syncToken: null,
    syncedAt: null,
    syncErrorAt: null,
    syncErrorCount: 0,
    syncSubscribedAt: null,
    syncSubscribedErrorAt: null,
    syncSubscribedErrorCount: 0,
    lastWebhookReceivedAt: null,
    ...overrides,
  } as SelectedCalendar;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CalendarCacheService", () => {
  let service: CalendarCacheService;
  let cacheRepo: CalendarCacheEventRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheRepo = makeCacheRepo();
    service = new CalendarCacheService({ cacheRepo });
  });

  // =========================================================================
  // fetchBusyTimesWithCache
  // =========================================================================

  describe("fetchBusyTimesWithCache", () => {
    // -----------------------------------------------------------------------
    // Fresh calendars => serve from cache
    // -----------------------------------------------------------------------

    test("returns cached busy times with correct start, end, timeZone for a fresh calendar", async () => {
      const freshCal = makeSelectedCalendar({
        id: "sc-fresh",
        syncedAt: new Date(),
      });

      const cachedBusy = [
        {
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          timeZone: "America/New_York",
        },
        {
          start: new Date("2026-03-25T14:00:00Z"),
          end: new Date("2026-03-25T15:30:00Z"),
          timeZone: null,
        },
      ];
      (cacheRepo.findBusyTimesBetween as ReturnType<typeof vi.fn>).mockResolvedValue(cachedBusy);

      const adapter = makeAdapter();

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-26T00:00:00Z",
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        start: new Date("2026-03-24T10:00:00Z"),
        end: new Date("2026-03-24T11:00:00Z"),
        timeZone: "America/New_York",
      });
      expect(result[1]).toEqual({
        start: new Date("2026-03-25T14:00:00Z"),
        end: new Date("2026-03-25T15:30:00Z"),
        timeZone: null,
      });

      expect(cacheRepo.findBusyTimesBetween).toHaveBeenCalledWith(
        ["sc-fresh"],
        new Date("2026-03-24T00:00:00Z"),
        new Date("2026-03-26T00:00:00Z")
      );
      expect(adapter.fetchBusyTimes).not.toHaveBeenCalled();
    });

    test("does not query cache when all calendars are stale", async () => {
      const staleCal = makeSelectedCalendar({
        id: "sc-stale",
        syncedAt: null,
      });

      const adapterBusy = [
        {
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          timeZone: "Europe/London",
        },
      ];
      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy),
      });

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [staleCal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(cacheRepo.findBusyTimesBetween).not.toHaveBeenCalled();
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      expect(adapter.fetchBusyTimes).toHaveBeenCalledWith({
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        calendars: [{ externalId: "ext-1", integration: "google_calendar", credentialId: 1 }],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        start: new Date("2026-03-24T10:00:00Z"),
        end: new Date("2026-03-24T11:00:00Z"),
        timeZone: "Europe/London",
      });
    });

    // -----------------------------------------------------------------------
    // Adapter timeZone preservation
    // -----------------------------------------------------------------------

    test("preserves timeZone from adapter response and normalizes undefined to null", async () => {
      const staleCal = makeSelectedCalendar({
        id: "sc-stale",
        syncedAt: new Date(Date.now() - 8 * ONE_DAY_MS),
      });

      const adapterBusy = [
        {
          start: new Date("2026-04-01T08:00:00Z"),
          end: new Date("2026-04-01T09:00:00Z"),
          timeZone: "Asia/Tokyo",
        },
        {
          start: new Date("2026-04-01T10:00:00Z"),
          end: new Date("2026-04-01T11:00:00Z"),
          // no timeZone => should be normalized to null
        },
      ];
      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy),
      });

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [staleCal],
        dateFrom: "2026-04-01T00:00:00Z",
        dateTo: "2026-04-02T00:00:00Z",
      });

      expect(result[0].timeZone).toBe("Asia/Tokyo");
      expect(result[1].timeZone).toBeNull();
    });

    // -----------------------------------------------------------------------
    // Mixed fresh + stale
    // -----------------------------------------------------------------------

    test("queries cache for fresh calendars and adapter for stale ones, merging results", async () => {
      const freshCal1 = makeSelectedCalendar({ id: "sc-f1", syncedAt: new Date() });
      const freshCal2 = makeSelectedCalendar({ id: "sc-f2", syncedAt: new Date() });
      const staleCal = makeSelectedCalendar({
        id: "sc-s1",
        externalId: "ext-stale",
        integration: "office365_calendar",
        credentialId: 2,
        syncedAt: new Date(Date.now() - 10 * ONE_DAY_MS),
      });
      const neverSynced = makeSelectedCalendar({
        id: "sc-never",
        externalId: "ext-never",
        integration: "caldav_calendar",
        credentialId: 3,
        syncedAt: null,
      });

      const cachedBusy = [
        { start: new Date("2026-03-24T09:00:00Z"), end: new Date("2026-03-24T10:00:00Z"), timeZone: null },
      ];
      (cacheRepo.findBusyTimesBetween as ReturnType<typeof vi.fn>).mockResolvedValue(cachedBusy);

      const adapterBusy = [
        { start: new Date("2026-03-24T14:00:00Z"), end: new Date("2026-03-24T15:00:00Z"), timeZone: "UTC" },
        { start: new Date("2026-03-24T16:00:00Z"), end: new Date("2026-03-24T17:00:00Z") },
      ];
      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy),
      });

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal1, freshCal2, staleCal, neverSynced],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(cacheRepo.findBusyTimesBetween).toHaveBeenCalledWith(
        ["sc-f1", "sc-f2"],
        new Date("2026-03-24T00:00:00Z"),
        new Date("2026-03-25T00:00:00Z")
      );

      expect(adapter.fetchBusyTimes).toHaveBeenCalledWith({
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
        calendars: [
          { externalId: "ext-stale", integration: "office365_calendar", credentialId: 2 },
          { externalId: "ext-never", integration: "caldav_calendar", credentialId: 3 },
        ],
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        start: new Date("2026-03-24T09:00:00Z"),
        end: new Date("2026-03-24T10:00:00Z"),
        timeZone: null,
      });
      expect(result[1]).toEqual({
        start: new Date("2026-03-24T14:00:00Z"),
        end: new Date("2026-03-24T15:00:00Z"),
        timeZone: "UTC",
      });
      expect(result[2]).toEqual({
        start: new Date("2026-03-24T16:00:00Z"),
        end: new Date("2026-03-24T17:00:00Z"),
        timeZone: null,
      });
    });

    // -----------------------------------------------------------------------
    // Adapter error with mixed calendars — cached results still returned
    // -----------------------------------------------------------------------

    test("returns cached results for fresh calendars even when adapter fails for stale ones", async () => {
      const freshCal = makeSelectedCalendar({ id: "sc-fresh", syncedAt: new Date() });
      const staleCal = makeSelectedCalendar({
        id: "sc-stale",
        externalId: "ext-stale",
        syncedAt: null,
      });

      const cachedBusy = [
        {
          start: new Date("2026-03-24T09:00:00Z"),
          end: new Date("2026-03-24T10:00:00Z"),
          timeZone: "US/Pacific",
        },
      ];
      (cacheRepo.findBusyTimesBetween as ReturnType<typeof vi.fn>).mockResolvedValue(cachedBusy);

      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("Provider unreachable")),
      });

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal, staleCal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        start: new Date("2026-03-24T09:00:00Z"),
        end: new Date("2026-03-24T10:00:00Z"),
        timeZone: "US/Pacific",
      });
    });

    test("logs error when adapter fails for stale calendars", async () => {
      const staleCal = makeSelectedCalendar({ id: "sc-stale", syncedAt: null });

      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue(new Error("API timeout")),
      });

      await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [staleCal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(mockLogError).toHaveBeenCalledWith(
        "Failed to fetch busy times for stale calendars from adapter",
        { error: "API timeout" }
      );
    });

    test("handles adapter error that is not an Error instance", async () => {
      const staleCal = makeSelectedCalendar({ id: "sc-stale", syncedAt: null });

      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockRejectedValue("string-error"),
      });

      await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [staleCal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(mockLogError).toHaveBeenCalledWith(
        "Failed to fetch busy times for stale calendars from adapter",
        { error: "string-error" }
      );
    });

    // -----------------------------------------------------------------------
    // Empty calendar list
    // -----------------------------------------------------------------------

    test("returns empty array when no calendars are provided", async () => {
      const adapter = makeAdapter();

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(result).toEqual([]);
      expect(cacheRepo.findBusyTimesBetween).not.toHaveBeenCalled();
      expect(adapter.fetchBusyTimes).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Cache bypass for >3 month ranges
    // -----------------------------------------------------------------------

    test("bypasses cache for range exceeding 3 months even when calendar is fresh", async () => {
      const freshCal = makeSelectedCalendar({ id: "sc-fresh", syncedAt: new Date() });

      const adapterBusy = [
        { start: new Date("2026-03-01T10:00:00Z"), end: new Date("2026-03-01T11:00:00Z"), timeZone: "UTC" },
      ];
      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy),
      });

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal],
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-07-01T00:00:00Z",
      });

      expect(cacheRepo.findBusyTimesBetween).not.toHaveBeenCalled();
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      expect(adapter.fetchBusyTimes).toHaveBeenCalledWith({
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-07-01T00:00:00Z",
        calendars: [{ externalId: "ext-1", integration: "google_calendar", credentialId: 1 }],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        start: new Date("2026-03-01T10:00:00Z"),
        end: new Date("2026-03-01T11:00:00Z"),
        timeZone: "UTC",
      });
    });

    test("uses cache when range is exactly 3 months (90 days)", async () => {
      const freshCal = makeSelectedCalendar({ id: "sc-fresh", syncedAt: new Date() });

      const cachedBusy = [
        { start: new Date("2026-02-15T10:00:00Z"), end: new Date("2026-02-15T11:00:00Z"), timeZone: null },
      ];
      (cacheRepo.findBusyTimesBetween as ReturnType<typeof vi.fn>).mockResolvedValue(cachedBusy);

      const adapter = makeAdapter();

      // Exactly 3 months = 3 * 30 * 24 * 60 * 60 * 1000 = 7776000000 ms
      // monthsSpan = 7776000000 / (30 * 24 * 60 * 60 * 1000) = 3.0
      // 3.0 > 3 is false, so cache is used
      const dateFrom = "2026-01-01T00:00:00Z";
      const threeMonthsMs = 3 * 30 * 24 * 60 * 60 * 1000;
      const dateTo = new Date(new Date(dateFrom).getTime() + threeMonthsMs).toISOString();

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal],
        dateFrom,
        dateTo,
      });

      expect(cacheRepo.findBusyTimesBetween).toHaveBeenCalledTimes(1);
      expect(adapter.fetchBusyTimes).not.toHaveBeenCalled();
      expect(result).toEqual(cachedBusy);
    });

    test("bypasses cache when range is exactly 3 months + 1 day", async () => {
      const freshCal = makeSelectedCalendar({ id: "sc-fresh", syncedAt: new Date() });

      const adapterBusy = [
        { start: new Date("2026-02-01T09:00:00Z"), end: new Date("2026-02-01T10:00:00Z") },
      ];
      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue(adapterBusy),
      });

      // 3 months + 1 day => monthsSpan > 3 => bypass
      const dateFrom = "2026-01-01T00:00:00Z";
      const threeMonthsPlusOneDayMs = 3 * 30 * 24 * 60 * 60 * 1000 + ONE_DAY_MS;
      const dateTo = new Date(new Date(dateFrom).getTime() + threeMonthsPlusOneDayMs).toISOString();

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal],
        dateFrom,
        dateTo,
      });

      expect(cacheRepo.findBusyTimesBetween).not.toHaveBeenCalled();
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].timeZone).toBeNull();
    });

    test("bypasses cache and logs bypassedCache: true for long ranges", async () => {
      const freshCal = makeSelectedCalendar({ id: "sc-fresh", syncedAt: new Date() });

      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([]),
      });

      await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal],
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-12-31T00:00:00Z",
      });

      expect(mockLogInfo).toHaveBeenCalledWith("fetchBusyTimesWithCache", {
        totalCalendars: 1,
        freshFromCache: 0,
        staleFromAdapter: 1,
        bypassedCache: true,
      });
    });

    // -----------------------------------------------------------------------
    // Custom config: maxCacheRangeMonths
    // -----------------------------------------------------------------------

    test("respects custom maxCacheRangeMonths config", async () => {
      const customService = new CalendarCacheService({
        cacheRepo,
        config: { maxCacheRangeMonths: 1 },
      });

      const freshCal = makeSelectedCalendar({ id: "sc-fresh", syncedAt: new Date() });

      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([]),
      });

      // 45 days > 1 month => should bypass cache
      const dateFrom = "2026-03-01T00:00:00Z";
      const dateTo = new Date(new Date(dateFrom).getTime() + 45 * ONE_DAY_MS).toISOString();

      await customService.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [freshCal],
        dateFrom,
        dateTo,
      });

      expect(cacheRepo.findBusyTimesBetween).not.toHaveBeenCalled();
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // Freshness boundary: syncedAt at threshold edges
    // -----------------------------------------------------------------------

    test("treats calendar as stale when syncedAt is exactly at threshold boundary", async () => {
      vi.useFakeTimers();
      const frozenNow = new Date("2026-03-25T12:00:00Z").getTime();
      vi.setSystemTime(frozenNow);

      // syncedAt exactly 7 days ago => now - syncedAt = threshold
      // condition: now - syncedAt.getTime() < staleSyncThresholdMs
      // threshold < threshold => false => STALE
      const cal = makeSelectedCalendar({
        id: "sc-boundary",
        syncedAt: new Date(frozenNow - SEVEN_DAYS_MS),
      });

      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([]),
      });

      await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [cal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(cacheRepo.findBusyTimesBetween).not.toHaveBeenCalled();
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    test("treats calendar as fresh when syncedAt is 1ms within threshold (just barely fresh)", async () => {
      vi.useFakeTimers();
      const frozenNow = new Date("2026-03-25T12:00:00Z").getTime();
      vi.setSystemTime(frozenNow);

      // 1ms less than 7 days ago => now - syncedAt = threshold - 1 < threshold => fresh
      const cal = makeSelectedCalendar({
        id: "sc-almost-fresh",
        syncedAt: new Date(frozenNow - SEVEN_DAYS_MS + 1),
      });

      const cachedBusy = [
        { start: new Date("2026-03-24T10:00:00Z"), end: new Date("2026-03-24T11:00:00Z"), timeZone: null },
      ];
      (cacheRepo.findBusyTimesBetween as ReturnType<typeof vi.fn>).mockResolvedValue(cachedBusy);

      const adapter = makeAdapter();

      const result = await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [cal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(cacheRepo.findBusyTimesBetween).toHaveBeenCalledTimes(1);
      expect(adapter.fetchBusyTimes).not.toHaveBeenCalled();
      expect(result).toEqual(cachedBusy);

      vi.useRealTimers();
    });

    test("treats calendar as stale when syncedAt is 1ms beyond threshold", async () => {
      vi.useFakeTimers();
      const frozenNow = new Date("2026-03-25T12:00:00Z").getTime();
      vi.setSystemTime(frozenNow);

      // 1ms more than 7 days ago => now - syncedAt = threshold + 1 > threshold => stale
      const cal = makeSelectedCalendar({
        id: "sc-just-stale",
        syncedAt: new Date(frozenNow - SEVEN_DAYS_MS - 1),
      });

      const adapter = makeAdapter({
        fetchBusyTimes: vi.fn().mockResolvedValue([]),
      });

      await service.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [cal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(cacheRepo.findBusyTimesBetween).not.toHaveBeenCalled();
      expect(adapter.fetchBusyTimes).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    // -----------------------------------------------------------------------
    // Custom staleSyncThresholdMs
    // -----------------------------------------------------------------------

    test("respects custom staleSyncThresholdMs config", async () => {
      const oneHourMs = 60 * 60 * 1000;
      const customService = new CalendarCacheService({
        cacheRepo,
        config: { staleSyncThresholdMs: oneHourMs },
      });

      // Synced 30 minutes ago — should be fresh with 1-hour threshold
      const cal = makeSelectedCalendar({
        id: "sc-custom-fresh",
        syncedAt: new Date(Date.now() - 30 * 60 * 1000),
      });

      const cachedBusy = [
        { start: new Date("2026-03-24T10:00:00Z"), end: new Date("2026-03-24T11:00:00Z"), timeZone: null },
      ];
      (cacheRepo.findBusyTimesBetween as ReturnType<typeof vi.fn>).mockResolvedValue(cachedBusy);

      const adapter = makeAdapter();

      const result = await customService.fetchBusyTimesWithCache({
        adapter,
        selectedCalendars: [cal],
        dateFrom: "2026-03-24T00:00:00Z",
        dateTo: "2026-03-25T00:00:00Z",
      });

      expect(cacheRepo.findBusyTimesBetween).toHaveBeenCalledTimes(1);
      expect(adapter.fetchBusyTimes).not.toHaveBeenCalled();
      expect(result).toEqual(cachedBusy);
    });
  });

  // =========================================================================
  // handleEvents
  // =========================================================================

  describe("handleEvents", () => {
    test("upserts non-cancelled events and deletes cancelled events with correct field mapping", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1" });

      const events: CalendarEvent[] = [
        {
          uid: "evt-1",
          title: "Team Standup",
          description: "Daily sync",
          location: "Room A",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T10:30:00Z"),
          status: "confirmed",
          iCalUID: "ical-1",
          timeZone: "America/Chicago",
          isAllDay: false,
          etag: '"etag-abc"',
          recurringEventId: "rec-100",
          originalStartTime: new Date("2026-03-24T10:00:00Z"),
        },
        {
          uid: "evt-2",
          title: "Cancelled Lunch",
          start: new Date("2026-03-24T12:00:00Z"),
          end: new Date("2026-03-24T13:00:00Z"),
          status: "cancelled",
          iCalUID: "ical-2",
        },
      ];

      await service.handleEvents(cal, events);

      expect(cacheRepo.upsertMany).toHaveBeenCalledTimes(1);
      expect(cacheRepo.upsertMany).toHaveBeenCalledWith([
        {
          externalId: "evt-1",
          selectedCalendarId: "sc-1",
          iCalUID: "ical-1",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T10:30:00Z"),
          summary: "Team Standup",
          description: "Daily sync",
          location: "Room A",
          isAllDay: false,
          timeZone: "America/Chicago",
          originalStartTime: new Date("2026-03-24T10:00:00Z"),
          recurringEventId: "rec-100",
          externalEtag: '"etag-abc"',
          status: "confirmed",
          iCalSequence: 0,
        },
      ]);

      expect(cacheRepo.deleteMany).toHaveBeenCalledTimes(1);
      expect(cacheRepo.deleteMany).toHaveBeenCalledWith([
        { selectedCalendarId: "sc-1", externalId: "evt-2" },
      ]);
    });

    test("handles tentative events as upserts (not cancelled)", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1" });

      const events: CalendarEvent[] = [
        {
          uid: "evt-tentative",
          start: new Date("2026-03-24T14:00:00Z"),
          end: new Date("2026-03-24T15:00:00Z"),
          status: "tentative",
        },
      ];

      await service.handleEvents(cal, events);

      const upserted = (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upserted).toHaveLength(1);
      expect(upserted[0].externalId).toBe("evt-tentative");
    });

    test("normalizes missing optional fields to null/defaults in upsert payload", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1" });

      const events: CalendarEvent[] = [
        {
          uid: "evt-minimal",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          status: "confirmed",
          // no title, description, location, iCalUID, timeZone, isAllDay, etag, recurringEventId, originalStartTime
        },
      ];

      await service.handleEvents(cal, events);

      expect(cacheRepo.upsertMany).toHaveBeenCalledWith([
        {
          externalId: "evt-minimal",
          selectedCalendarId: "sc-1",
          iCalUID: null,
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          summary: null,
          description: null,
          location: null,
          isAllDay: false,
          timeZone: null,
          originalStartTime: null,
          recurringEventId: null,
          externalEtag: "",
          status: "confirmed",
          iCalSequence: 0,
        },
      ]);
    });

    // -----------------------------------------------------------------------
    // Empty, single, and large batch
    // -----------------------------------------------------------------------

    test("passes empty arrays to repo when events list is empty", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1" });

      await service.handleEvents(cal, []);

      expect(cacheRepo.upsertMany).toHaveBeenCalledWith([]);
      expect(cacheRepo.deleteMany).toHaveBeenCalledWith([]);
    });

    test("handles a single confirmed event correctly", async () => {
      const cal = makeSelectedCalendar({ id: "sc-1" });

      const events: CalendarEvent[] = [
        {
          uid: "only-one",
          start: new Date("2026-05-01T08:00:00Z"),
          end: new Date("2026-05-01T09:00:00Z"),
          status: "confirmed",
          timeZone: "Europe/Berlin",
        },
      ];

      await service.handleEvents(cal, events);

      const upserted = (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upserted).toHaveLength(1);
      expect(upserted[0].externalId).toBe("only-one");
      expect(upserted[0].timeZone).toBe("Europe/Berlin");
      expect(upserted[0].start).toEqual(new Date("2026-05-01T08:00:00Z"));
      expect(upserted[0].end).toEqual(new Date("2026-05-01T09:00:00Z"));

      const deleted = (cacheRepo.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(deleted).toHaveLength(0);
    });

    test("handles a large batch of 100 events with mixed statuses", async () => {
      const cal = makeSelectedCalendar({ id: "sc-batch" });

      const events: CalendarEvent[] = Array.from({ length: 100 }, (_, i) => ({
        uid: `evt-${i}`,
        start: new Date(`2026-04-01T${String(i % 24).padStart(2, "0")}:00:00Z`),
        end: new Date(`2026-04-01T${String((i % 24) + 1).padStart(2, "0")}:00:00Z`),
        status: i % 5 === 0 ? ("cancelled" as const) : ("confirmed" as const),
      }));

      await service.handleEvents(cal, events);

      const upserted = (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const deleted = (cacheRepo.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Every 5th event (0, 5, 10, ...) is cancelled = 20 cancelled
      expect(deleted).toHaveLength(20);
      expect(upserted).toHaveLength(80);

      // Verify a specific upserted event
      const evt3 = upserted.find((e: { externalId: string }) => e.externalId === "evt-3");
      expect(evt3).toBeDefined();
      expect(evt3.selectedCalendarId).toBe("sc-batch");

      // Verify a specific deleted event
      const del10 = deleted.find((e: { externalId: string }) => e.externalId === "evt-10");
      expect(del10).toBeDefined();
      expect(del10.selectedCalendarId).toBe("sc-batch");
    });

    // -----------------------------------------------------------------------
    // Promise.allSettled failure paths
    // -----------------------------------------------------------------------

    test("logs warning when upsertMany fails but deleteMany succeeds", async () => {
      const cal = makeSelectedCalendar({ id: "sc-fail" });
      (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB write failed"));

      const events: CalendarEvent[] = [
        {
          uid: "evt-1",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          status: "confirmed",
        },
        {
          uid: "evt-2",
          start: new Date("2026-03-24T12:00:00Z"),
          end: new Date("2026-03-24T13:00:00Z"),
          status: "cancelled",
        },
      ];

      // Should not throw
      await service.handleEvents(cal, events);

      expect(mockLogWarn).toHaveBeenCalledWith("handleEvents: upsertMany failed (self-healing on next sync)", {
        selectedCalendarId: "sc-fail",
        error: "DB write failed",
      });
      // deleteMany should have been called and succeeded
      expect(cacheRepo.deleteMany).toHaveBeenCalledTimes(1);
    });

    test("logs warning when deleteMany fails but upsertMany succeeds", async () => {
      const cal = makeSelectedCalendar({ id: "sc-fail" });
      (cacheRepo.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB delete failed"));

      const events: CalendarEvent[] = [
        {
          uid: "evt-1",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          status: "confirmed",
        },
        {
          uid: "evt-2",
          start: new Date("2026-03-24T12:00:00Z"),
          end: new Date("2026-03-24T13:00:00Z"),
          status: "cancelled",
        },
      ];

      await service.handleEvents(cal, events);

      expect(mockLogWarn).toHaveBeenCalledWith("handleEvents: deleteMany failed (self-healing on next sync)", {
        selectedCalendarId: "sc-fail",
        error: "DB delete failed",
      });
      // upsertMany should have been called and succeeded
      expect(cacheRepo.upsertMany).toHaveBeenCalledTimes(1);
    });

    test("logs both warnings when upsertMany and deleteMany both fail", async () => {
      const cal = makeSelectedCalendar({ id: "sc-double-fail" });
      (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Upsert explosion"));
      (cacheRepo.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Delete explosion"));

      const events: CalendarEvent[] = [
        {
          uid: "evt-1",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          status: "confirmed",
        },
        {
          uid: "evt-2",
          start: new Date("2026-03-24T12:00:00Z"),
          end: new Date("2026-03-24T13:00:00Z"),
          status: "cancelled",
        },
      ];

      await service.handleEvents(cal, events);

      expect(mockLogWarn).toHaveBeenCalledWith("handleEvents: deleteMany failed (self-healing on next sync)", {
        selectedCalendarId: "sc-double-fail",
        error: "Delete explosion",
      });
      expect(mockLogWarn).toHaveBeenCalledWith("handleEvents: upsertMany failed (self-healing on next sync)", {
        selectedCalendarId: "sc-double-fail",
        error: "Upsert explosion",
      });
    });

    test("logs non-Error rejection reasons as strings in failure paths", async () => {
      const cal = makeSelectedCalendar({ id: "sc-weird-error" });
      (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mockRejectedValue(42);
      (cacheRepo.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue({ code: "UNKNOWN" });

      await service.handleEvents(cal, [
        {
          uid: "evt-1",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          status: "confirmed",
        },
        {
          uid: "evt-2",
          start: new Date("2026-03-24T12:00:00Z"),
          end: new Date("2026-03-24T13:00:00Z"),
          status: "cancelled",
        },
      ]);

      expect(mockLogWarn).toHaveBeenCalledWith("handleEvents: upsertMany failed (self-healing on next sync)", {
        selectedCalendarId: "sc-weird-error",
        error: "42",
      });
      expect(mockLogWarn).toHaveBeenCalledWith("handleEvents: deleteMany failed (self-healing on next sync)", {
        selectedCalendarId: "sc-weird-error",
        error: "[object Object]",
      });
    });

    // -----------------------------------------------------------------------
    // timeZone preserved through handleEvents
    // -----------------------------------------------------------------------

    test("preserves timeZone value in upsert payload when adapter provides it", async () => {
      const cal = makeSelectedCalendar({ id: "sc-tz" });

      const events: CalendarEvent[] = [
        {
          uid: "evt-tz",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          status: "confirmed",
          timeZone: "Asia/Tokyo",
        },
      ];

      await service.handleEvents(cal, events);

      const upserted = (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upserted[0].timeZone).toBe("Asia/Tokyo");
    });

    test("sets timeZone to null in upsert payload when adapter does not provide it", async () => {
      const cal = makeSelectedCalendar({ id: "sc-no-tz" });

      const events: CalendarEvent[] = [
        {
          uid: "evt-no-tz",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
          status: "confirmed",
        },
      ];

      await service.handleEvents(cal, events);

      const upserted = (cacheRepo.upsertMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upserted[0].timeZone).toBeNull();
    });
  });

  // =========================================================================
  // cleanupCache
  // =========================================================================

  describe("cleanupCache", () => {
    test("delegates to repo.deleteAllBySelectedCalendarId with exact ID", async () => {
      await service.cleanupCache("sc-cleanup-target");

      expect(cacheRepo.deleteAllBySelectedCalendarId).toHaveBeenCalledTimes(1);
      expect(cacheRepo.deleteAllBySelectedCalendarId).toHaveBeenCalledWith("sc-cleanup-target");
    });
  });

  // =========================================================================
  // cleanupStaleCache
  // =========================================================================

  describe("cleanupStaleCache", () => {
    test("delegates to repo.deleteStale with no arguments", async () => {
      await service.cleanupStaleCache();

      expect(cacheRepo.deleteStale).toHaveBeenCalledTimes(1);
      expect(cacheRepo.deleteStale).toHaveBeenCalledWith();
    });
  });
});
