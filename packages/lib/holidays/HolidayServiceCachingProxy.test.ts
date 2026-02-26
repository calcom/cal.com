import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/holidays/repositories/HolidayRepository", () => ({
  HolidayRepository: {
    findFirstCacheEntry: vi.fn(),
    refreshCache: vi.fn(),
    findManyCachedHolidays: vi.fn(),
    findCachedHolidaysInRange: vi.fn(),
  },
}));

vi.mock("./GoogleCalendarClient", () => {
  const mockFetch = vi.fn();
  return {
    getGoogleCalendarClient: vi.fn().mockReturnValue({
      fetchHolidays: mockFetch,
    }),
    GoogleCalendarClient: class {
      fetchHolidays = mockFetch;
    },
  };
});

vi.mock("./constants", () => ({
  GOOGLE_HOLIDAY_CALENDARS: {
    US: { name: "United States", calendarId: "en.usa#holiday@group.v.calendar.google.com" },
  },
  HOLIDAY_CACHE_DAYS: 7,
}));

vi.mock("@calcom/dayjs", () => {
  const realDayjs = (date?: string | Date) => {
    const d = date ? new Date(date) : new Date("2026-01-15T00:00:00Z");
    return {
      subtract: (amount: number, _unit: string) => realDayjs(new Date(d.getTime() - amount * 86400000)),
      toDate: () => d,
      year: () => d.getFullYear(),
    };
  };
  return { default: realDayjs };
});

// biome-ignore lint/style/noRestrictedImports: test file mirrors source's import of HolidayRepository
import { HolidayRepository } from "@calcom/features/holidays/repositories/HolidayRepository";
import { getGoogleCalendarClient } from "./GoogleCalendarClient";
import { getHolidayServiceCachingProxy, HolidayServiceCachingProxy } from "./HolidayServiceCachingProxy";

const mockFetchHolidays = vi.mocked(getGoogleCalendarClient)().fetchHolidays as ReturnType<typeof vi.fn>;

describe("HolidayServiceCachingProxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHolidaysForCountry", () => {
    it("returns cached holidays when cache is fresh", async () => {
      const cachedEntry = { updatedAt: new Date("2026-01-14T00:00:00Z") };
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValueOnce(cachedEntry as never);
      vi.mocked(HolidayRepository.findManyCachedHolidays).mockResolvedValueOnce([
        {
          id: "1",
          countryCode: "US",
          eventId: "ev1",
          name: "New Year",
          date: new Date("2026-01-01"),
          year: 2026,
        },
      ] as never);

      const proxy = new HolidayServiceCachingProxy();
      const result = await proxy.getHolidaysForCountry("US", 2026);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("New Year");
      expect(HolidayRepository.refreshCache).not.toHaveBeenCalled();
    });

    it("refreshes cache when stale, then returns holidays", async () => {
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValueOnce({
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      } as never);
      vi.mocked(HolidayRepository.refreshCache).mockResolvedValueOnce(undefined as never);
      mockFetchHolidays.mockResolvedValueOnce([
        {
          id: "US_ev1",
          countryCode: "US",
          eventId: "ev1",
          name: "New Year",
          date: new Date("2026-01-01"),
          year: 2026,
        },
      ]);
      vi.mocked(HolidayRepository.findManyCachedHolidays).mockResolvedValueOnce([
        {
          id: "1",
          countryCode: "US",
          eventId: "ev1",
          name: "New Year",
          date: new Date("2026-01-01"),
          year: 2026,
        },
      ] as never);

      const proxy = new HolidayServiceCachingProxy();
      const result = await proxy.getHolidaysForCountry("US", 2026);

      expect(result).toHaveLength(1);
      expect(HolidayRepository.refreshCache).toHaveBeenCalled();
    });

    it("handles empty cache (first call)", async () => {
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValueOnce(null as never);
      vi.mocked(HolidayRepository.refreshCache).mockResolvedValueOnce(undefined as never);
      mockFetchHolidays.mockResolvedValueOnce([]);
      vi.mocked(HolidayRepository.findManyCachedHolidays).mockResolvedValueOnce([] as never);

      const proxy = new HolidayServiceCachingProxy();
      const result = await proxy.getHolidaysForCountry("US", 2026);

      expect(result).toEqual([]);
      expect(HolidayRepository.refreshCache).toHaveBeenCalled();
    });
  });

  describe("getHolidaysInRange", () => {
    it("checks cache staleness for each year in range", async () => {
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValue({
        updatedAt: new Date("2026-01-14T00:00:00Z"),
      } as never);
      vi.mocked(HolidayRepository.findCachedHolidaysInRange).mockResolvedValueOnce([] as never);

      const proxy = new HolidayServiceCachingProxy();
      await proxy.getHolidaysInRange("US", new Date("2026-01-01"), new Date("2026-12-31"));

      expect(HolidayRepository.findFirstCacheEntry).toHaveBeenCalledWith({
        countryCode: "US",
        year: 2026,
      });
    });

    it("handles range spanning multiple years", async () => {
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValue({
        updatedAt: new Date("2026-01-14T00:00:00Z"),
      } as never);
      vi.mocked(HolidayRepository.findCachedHolidaysInRange).mockResolvedValueOnce([] as never);

      const proxy = new HolidayServiceCachingProxy();
      await proxy.getHolidaysInRange("US", new Date("2025-12-01"), new Date("2026-02-01"));

      expect(HolidayRepository.findFirstCacheEntry).toHaveBeenCalledTimes(2);
    });

    it("maps cached range data to CachedHoliday format", async () => {
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValue({
        updatedAt: new Date("2026-01-14T00:00:00Z"),
      } as never);
      vi.mocked(HolidayRepository.findCachedHolidaysInRange).mockResolvedValueOnce([
        {
          id: "1",
          countryCode: "US",
          eventId: "ev1",
          name: "MLK Day",
          date: new Date("2026-01-19"),
          year: 2026,
        },
      ] as never);

      const proxy = new HolidayServiceCachingProxy();
      const result = await proxy.getHolidaysInRange("US", new Date("2026-01-01"), new Date("2026-01-31"));

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("MLK Day");
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("countryCode");
      expect(result[0]).toHaveProperty("eventId");
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("year");
    });
  });

  describe("refreshCache", () => {
    it("catches and logs errors from calendar client", async () => {
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValueOnce(null as never);
      mockFetchHolidays.mockRejectedValueOnce(new Error("API error"));
      vi.mocked(HolidayRepository.findManyCachedHolidays).mockResolvedValueOnce([] as never);

      const proxy = new HolidayServiceCachingProxy();
      const result = await proxy.getHolidaysForCountry("US", 2026);

      expect(result).toEqual([]);
    });
  });
});

describe("getHolidayServiceCachingProxy", () => {
  it("returns a HolidayServiceCachingProxy instance", () => {
    const proxy = getHolidayServiceCachingProxy();
    expect(proxy).toBeInstanceOf(HolidayServiceCachingProxy);
  });
});
