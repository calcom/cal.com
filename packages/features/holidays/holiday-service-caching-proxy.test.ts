import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repositories/HolidayRepository", () => ({
  HolidayRepository: {
    findFirstCacheEntry: vi.fn(),
    refreshCache: vi.fn(),
    findManyCachedHolidays: vi.fn(),
    findCachedHolidaysInRange: vi.fn(),
    findCachedHolidaysInRangeForCountries: vi.fn(),
  },
}));

vi.mock("@calcom/lib/holidays/GoogleCalendarClient", () => {
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

vi.mock("@calcom/lib/holidays/constants", () => ({
  GOOGLE_HOLIDAY_CALENDARS: {
    US: { name: "United States", calendarId: "en.usa#holiday@group.v.calendar.google.com" },
    DE: { name: "Germany", calendarId: "en.german#holiday@group.v.calendar.google.com" },
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

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

import { HolidayRepository } from "./repositories/HolidayRepository";
import { getGoogleCalendarClient } from "@calcom/lib/holidays/GoogleCalendarClient";
import { getHolidayServiceCachingProxy, HolidayServiceCachingProxy } from "./holiday-service-caching-proxy";

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

  describe("getHolidaysInRangeForCountries", () => {
    it("returns holidays grouped by country code from a single query", async () => {
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValue({
        updatedAt: new Date("2026-01-14T00:00:00Z"),
      } as never);
      vi.mocked(HolidayRepository.findCachedHolidaysInRangeForCountries).mockResolvedValueOnce([
        { id: "1", countryCode: "US", eventId: "ev1", name: "Independence Day", date: new Date("2026-07-04"), year: 2026 },
        { id: "2", countryCode: "DE", eventId: "ev2", name: "Tag der Deutschen Einheit", date: new Date("2026-10-03"), year: 2026 },
      ] as never);

      const proxy = new HolidayServiceCachingProxy();
      const result = await proxy.getHolidaysInRangeForCountries({
        countryCodes: ["US", "DE"],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result.get("US")).toHaveLength(1);
      expect(result.get("US")![0].name).toBe("Independence Day");
      expect(result.get("DE")).toHaveLength(1);
      expect(result.get("DE")![0].name).toBe("Tag der Deutschen Einheit");
      expect(HolidayRepository.findCachedHolidaysInRangeForCountries).toHaveBeenCalledWith({
        countryCodes: ["US", "DE"],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });
    });

    it("refreshes stale caches before fetching", async () => {
      // First country (US) is stale, second (DE) is fresh
      vi.mocked(HolidayRepository.findFirstCacheEntry)
        .mockResolvedValueOnce(null as never) // US 2026 — no cache entry = stale
        .mockResolvedValueOnce({ updatedAt: new Date("2026-01-14T00:00:00Z") } as never); // DE 2026 — fresh
      vi.mocked(HolidayRepository.refreshCache).mockResolvedValue(undefined as never);
      mockFetchHolidays.mockResolvedValue([]);
      vi.mocked(HolidayRepository.findCachedHolidaysInRangeForCountries).mockResolvedValueOnce([] as never);

      const proxy = new HolidayServiceCachingProxy();
      await proxy.getHolidaysInRangeForCountries({ countryCodes: ["US", "DE"], startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") });

      // US should trigger refresh, DE should not
      expect(HolidayRepository.refreshCache).toHaveBeenCalledTimes(1);
      expect(HolidayRepository.refreshCache).toHaveBeenCalledWith(
        expect.objectContaining({ countryCode: "US", year: 2026 })
      );
    });

    it("returns empty map for empty country codes array", async () => {
      vi.mocked(HolidayRepository.findCachedHolidaysInRangeForCountries).mockResolvedValueOnce([] as never);

      const proxy = new HolidayServiceCachingProxy();
      const result = await proxy.getHolidaysInRangeForCountries({
        countryCodes: [],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result.size).toBe(0);
    });

    it("handles range spanning multiple years and refreshes each year per country", async () => {
      // Both US and DE are stale for both years
      vi.mocked(HolidayRepository.findFirstCacheEntry).mockResolvedValue(null as never);
      vi.mocked(HolidayRepository.refreshCache).mockResolvedValue(undefined as never);
      mockFetchHolidays.mockResolvedValue([]);
      vi.mocked(HolidayRepository.findCachedHolidaysInRangeForCountries).mockResolvedValueOnce([] as never);

      const proxy = new HolidayServiceCachingProxy();
      await proxy.getHolidaysInRangeForCountries({
        countryCodes: ["US", "DE"],
        startDate: new Date("2025-12-01"),
        endDate: new Date("2026-02-01"),
      });

      // 2 countries × 2 years = 4 staleness checks and 4 refreshes
      expect(HolidayRepository.findFirstCacheEntry).toHaveBeenCalledTimes(4);
      expect(HolidayRepository.refreshCache).toHaveBeenCalledTimes(4);
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
