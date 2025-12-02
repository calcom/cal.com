import { describe, expect, it, vi } from "vitest";

import { HolidayServiceClass } from "./HolidayService";

// Mock data
const mockHolidayData = {
  generatedAt: "2024-01-01T00:00:00.000Z",
  yearsIncluded: [2025, 2026],
  countries: [
    {
      code: "US",
      name: "United States",
      holidays: [
        {
          id: "new_years_day",
          name: "New Year's Day",
          type: "public",
          dates: [
            { year: 2025, date: "2025-01-01" },
            { year: 2026, date: "2026-01-01" },
          ],
        },
        {
          id: "christmas_day",
          name: "Christmas Day",
          type: "public",
          dates: [
            { year: 2025, date: "2025-12-25" },
            { year: 2026, date: "2026-12-25" },
          ],
        },
      ],
    },
    {
      code: "GB",
      name: "United Kingdom",
      holidays: [
        {
          id: "boxing_day",
          name: "Boxing Day",
          type: "public",
          dates: [{ year: 2025, date: "2025-12-26" }],
        },
      ],
    },
  ],
};

// Test instance with mock data
class TestHolidayService extends HolidayServiceClass {
  constructor() {
    super();
    // @ts-expect-error - accessing private property for testing
    this.data = mockHolidayData;
  }
}

describe("HolidayService", () => {
  const service = new TestHolidayService();

  describe("getSupportedCountries", () => {
    it("should return list of countries with code and name", () => {
      const countries = service.getSupportedCountries();

      expect(countries).toEqual([
        { code: "US", name: "United States" },
        { code: "GB", name: "United Kingdom" },
      ]);
    });
  });

  describe("getHolidaysForCountry", () => {
    it("should return holidays for valid country", () => {
      const holidays = service.getHolidaysForCountry("US");

      expect(holidays).toHaveLength(2);
      expect(holidays[0].id).toBe("new_years_day");
    });

    it("should return empty array for invalid country", () => {
      expect(service.getHolidaysForCountry("INVALID")).toEqual([]);
    });
  });

  describe("getHolidaysWithStatus", () => {
    it("should mark holidays as enabled by default", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));

      const holidays = service.getHolidaysWithStatus("US", []);

      expect(holidays[0].enabled).toBe(true);
      expect(holidays[1].enabled).toBe(true);

      vi.useRealTimers();
    });

    it("should mark disabled holidays correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));

      const holidays = service.getHolidaysWithStatus("US", ["christmas_day"]);

      const christmas = holidays.find((h) => h.id === "christmas_day");
      expect(christmas?.enabled).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("getHolidayOnDate", () => {
    it("should return holiday if date matches", () => {
      const holiday = service.getHolidayOnDate(new Date("2025-12-25"), "US");

      expect(holiday?.id).toBe("christmas_day");
    });

    it("should return null if date is not a holiday", () => {
      expect(service.getHolidayOnDate(new Date("2025-06-15"), "US")).toBeNull();
    });

    it("should return null if holiday is disabled", () => {
      const holiday = service.getHolidayOnDate(new Date("2025-12-25"), "US", ["christmas_day"]);

      expect(holiday).toBeNull();
    });
  });

  describe("getHolidayDatesInRange", () => {
    it("should return holidays within date range", () => {
      const holidays = service.getHolidayDatesInRange(
        "US",
        [],
        new Date("2025-12-01"),
        new Date("2025-12-31")
      );

      expect(holidays).toHaveLength(1);
      expect(holidays[0].holiday.id).toBe("christmas_day");
    });

    it("should exclude disabled holidays", () => {
      const holidays = service.getHolidayDatesInRange(
        "US",
        ["christmas_day"],
        new Date("2025-12-01"),
        new Date("2025-12-31")
      );

      expect(holidays).toEqual([]);
    });
  });
});
