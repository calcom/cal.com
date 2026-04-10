import { beforeEach, describe, expect, it, vi } from "vitest";

import { GOOGLE_HOLIDAY_CALENDARS } from "@calcom/lib/holidays/constants";
import type { CachedHoliday } from "./holiday-service-caching-proxy";

vi.mock("./holiday-service-caching-proxy", () => ({
  getHolidayServiceCachingProxy: vi.fn(() => ({
    getHolidaysForCountry: vi.fn(),
    getHolidaysInRange: vi.fn(),
    getHolidaysInRangeForCountries: vi.fn(),
  })),
  HolidayServiceCachingProxy: vi.fn(),
}));

import { getHolidayServiceCachingProxy } from "./holiday-service-caching-proxy";
import { HolidayService } from "./holiday-service";

const mockHolidays: CachedHoliday[] = [
  {
    id: "1",
    countryCode: "US",
    eventId: "new_years_day_2025",
    name: "New Year's Day",
    date: new Date("2025-01-01"),
    year: 2025,
  },
  {
    id: "2",
    countryCode: "US",
    eventId: "christmas_day_2025",
    name: "Christmas Day",
    date: new Date("2025-12-25"),
    year: 2025,
  },
];

describe("HolidayService", () => {
  let holidayService: HolidayService;
  let mockCachingProxy: ReturnType<typeof getHolidayServiceCachingProxy>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCachingProxy = {
      getHolidaysForCountry: vi.fn(),
      getHolidaysInRange: vi.fn(),
      getHolidaysInRangeForCountries: vi.fn(),
    } as unknown as ReturnType<typeof getHolidayServiceCachingProxy>;
    vi.mocked(getHolidayServiceCachingProxy).mockReturnValue(mockCachingProxy);
    holidayService = new HolidayService(mockCachingProxy);
  });

  describe("getSupportedCountries", () => {
    it("should return list of countries from GOOGLE_HOLIDAY_CALENDARS", () => {
      const countries = holidayService.getSupportedCountries();

      expect(countries.length).toBe(Object.keys(GOOGLE_HOLIDAY_CALENDARS).length);
      expect(countries.find((c) => c.code === "US")).toEqual({
        code: "US",
        name: "United States",
      });
    });
  });

  describe("getHolidaysForCountry", () => {
    it("should return holidays from caching proxy", async () => {
      vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

      const holidays = await holidayService.getHolidaysForCountry("US", 2025);

      expect(mockCachingProxy.getHolidaysForCountry).toHaveBeenCalledWith("US", 2025);
      expect(holidays).toHaveLength(2);
      expect(holidays[0].name).toBe("New Year's Day");
    });
  });

  describe("getHolidaysWithStatus", () => {
    it("should mark holidays as enabled by default", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));
      vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

      const holidays = await holidayService.getHolidaysWithStatus("US", []);

      expect(holidays.find((h) => h.id === "christmas_day_2025")?.enabled).toBe(true);

      vi.useRealTimers();
    });

    it("should mark disabled holidays correctly", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));
      vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

      const holidays = await holidayService.getHolidaysWithStatus("US", ["christmas_day_2025"]);

      expect(holidays.find((h) => h.id === "christmas_day_2025")?.enabled).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("getHolidayDatesInRange", () => {
    it("should return holidays within date range", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRange).mockResolvedValue([mockHolidays[1]]);

      const holidays = await holidayService.getHolidayDatesInRange(
        "US",
        [],
        new Date("2025-12-01"),
        new Date("2025-12-31")
      );

      expect(holidays).toHaveLength(1);
      expect(holidays[0].holiday.name).toBe("Christmas Day");
    });

    it("should exclude disabled holidays", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRange).mockResolvedValue([mockHolidays[1]]);

      const holidays = await holidayService.getHolidayDatesInRange(
        "US",
        ["christmas_day_2025"],
        new Date("2025-12-01"),
        new Date("2025-12-31")
      );

      expect(holidays).toEqual([]);
    });
  });

  describe("getHolidayDatesInRangeForCountries", () => {
    it("should batch-fetch and transform holidays for multiple countries", async () => {
      const gbHoliday: CachedHoliday = {
        id: "3",
        countryCode: "GB",
        eventId: "boxing_day_2025",
        name: "Boxing Day",
        date: new Date("2025-12-26"),
        year: 2025,
      };

      vi.mocked(mockCachingProxy.getHolidaysInRangeForCountries).mockResolvedValue(
        new Map([
          [
            "US",
            [mockHolidays[1]], // Christmas
          ],
          ["GB", [gbHoliday]],
        ])
      );

      const result = await holidayService.getHolidayDatesInRangeForCountries({
        countryCodes: ["US", "GB"],
        startDate: new Date("2025-12-01"),
        endDate: new Date("2025-12-31"),
      });

      expect(result.size).toBe(2);

      const usHolidays = result.get("US");
      expect(usHolidays).toHaveLength(1);
      expect(usHolidays![0].holiday.name).toBe("Christmas Day");
      expect(usHolidays![0].date).toBe("2025-12-25");

      const gbHolidays = result.get("GB");
      expect(gbHolidays).toHaveLength(1);
      expect(gbHolidays![0].holiday.name).toBe("Boxing Day");
      expect(gbHolidays![0].date).toBe("2025-12-26");
    });

    it("should return empty map when no country codes are provided", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRangeForCountries).mockResolvedValue(new Map());

      const result = await holidayService.getHolidayDatesInRangeForCountries({
        countryCodes: [],
        startDate: new Date("2025-12-01"),
        endDate: new Date("2025-12-31"),
      });

      expect(result.size).toBe(0);
    });

    it("should return empty array for country code with no holidays in range", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRangeForCountries).mockResolvedValue(
        new Map([["US", []]])
      );

      const result = await holidayService.getHolidayDatesInRangeForCountries({
        countryCodes: ["US"],
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-03-31"),
      });

      expect(result.get("US")).toEqual([]);
    });

    it("should omit country codes not returned by the caching proxy", async () => {
      // Requested ["US", "DE"] but proxy only returns US (DE has no cached data)
      vi.mocked(mockCachingProxy.getHolidaysInRangeForCountries).mockResolvedValue(
        new Map([["US", [mockHolidays[0]]]])
      );

      const result = await holidayService.getHolidayDatesInRangeForCountries({
        countryCodes: ["US", "DE"],
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });

      expect(result.size).toBe(1);
      expect(result.has("US")).toBe(true);
      expect(result.has("DE")).toBe(false);
    });

    it("should sort holidays by date within each country", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRangeForCountries).mockResolvedValue(
        new Map([
          [
            "US",
            [
              mockHolidays[1], // Christmas (Dec 25)
              mockHolidays[0], // New Year's (Jan 1)
            ],
          ],
        ])
      );

      const result = await holidayService.getHolidayDatesInRangeForCountries({
        countryCodes: ["US"],
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });

      const usHolidays = result.get("US")!;
      expect(usHolidays[0].date).toBe("2025-01-01");
      expect(usHolidays[1].date).toBe("2025-12-25");
    });
  });

  describe("isSupportedCountry", () => {
    it("returns true for a valid country code", () => {
      expect(holidayService.isSupportedCountry("US")).toBe(true);
    });

    it("returns false for an invalid country code", () => {
      expect(holidayService.isSupportedCountry("ZZ")).toBe(false);
    });
  });

  describe("getSupportedCountries caching", () => {
    it("returns cached result on second call", () => {
      const first = holidayService.getSupportedCountries();
      const second = holidayService.getSupportedCountries();
      expect(first).toBe(second); // Same reference = cached
    });
  });

  describe("hasHolidaysInRange", () => {
    it("returns true when holidays exist in range", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRange).mockResolvedValue([mockHolidays[1]]);

      const result = await holidayService.hasHolidaysInRange(
        "US",
        [],
        new Date("2025-12-01"),
        new Date("2025-12-31")
      );

      expect(result).toBe(true);
    });

    it("returns false when no holidays exist in range", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRange).mockResolvedValue([]);

      const result = await holidayService.hasHolidaysInRange(
        "US",
        [],
        new Date("2025-03-01"),
        new Date("2025-03-31")
      );

      expect(result).toBe(false);
    });

    it("returns false when all holidays in range are disabled", async () => {
      vi.mocked(mockCachingProxy.getHolidaysInRange).mockResolvedValue([mockHolidays[1]]);

      const result = await holidayService.hasHolidaysInRange(
        "US",
        ["christmas_day_2025"],
        new Date("2025-12-01"),
        new Date("2025-12-31")
      );

      expect(result).toBe(false);
    });
  });

  describe("getHolidaysWithStatus - filters past holidays", () => {
    it("excludes holidays before today", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-12-20"));
      vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

      const holidays = await holidayService.getHolidaysWithStatus("US", []);

      // New Year's 2025-01-01 is past, should be filtered out
      expect(holidays.find((h) => h.id === "new_years_day_2025")).toBeUndefined();
      // Christmas 2025-12-25 is upcoming, should be included
      expect(holidays.find((h) => h.id === "christmas_day_2025")).toBeDefined();

      vi.useRealTimers();
    });
  });
});
