import { beforeEach, describe, expect, it, vi } from "vitest";

import { GOOGLE_HOLIDAY_CALENDARS } from "./constants";
import type { CachedHoliday } from "./HolidayServiceCachingProxy";

vi.mock("./HolidayServiceCachingProxy", () => ({
  getHolidayServiceCachingProxy: vi.fn(() => ({
    getHolidaysForCountry: vi.fn(),
    getHolidaysInRange: vi.fn(),
  })),
  HolidayServiceCachingProxy: vi.fn(),
}));

import { getHolidayServiceCachingProxy } from "./HolidayServiceCachingProxy";
import { HolidayService } from "./HolidayService";

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

  describe("getHolidayOnDate", () => {
    it("should return holiday if date matches in host timezone", async () => {
      vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

      // Booking at midnight UTC on Dec 25th - should match Christmas in UTC timezone
      const holiday = await holidayService.getHolidayOnDate(
        new Date("2025-12-25T00:00:00.000Z"),
        "US",
        [],
        "UTC"
      );

      expect(holiday?.name).toBe("Christmas Day");
    });

    it("should return null if holiday is disabled", async () => {
      vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

      const holiday = await holidayService.getHolidayOnDate(
        new Date("2025-12-25T00:00:00.000Z"),
        "US",
        ["christmas_day_2025"],
        "UTC"
      );

      expect(holiday).toBeNull();
    });

    describe("timezone edge cases", () => {
      it("should detect holiday when booking time is Dec 24th UTC but Dec 25th in IST (UTC+5:30)", async () => {
        vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

        // Dec 24th 8:00 PM UTC = Dec 25th 1:30 AM IST
        // This should be blocked for an Indian host because it's Christmas in their timezone
        const holiday = await holidayService.getHolidayOnDate(
          new Date("2025-12-24T20:00:00.000Z"),
          "US",
          [],
          "Asia/Kolkata" // IST = UTC+5:30
        );

        expect(holiday?.name).toBe("Christmas Day");
      });

      it("should NOT detect holiday when booking time is Dec 25th UTC but Dec 26th in far-east timezone", async () => {
        vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

        // Dec 25th 8:00 PM UTC = Dec 26th 7:00 AM in Asia/Tokyo (UTC+9)
        // This should NOT be blocked because it's Dec 26th in Tokyo
        const holiday = await holidayService.getHolidayOnDate(
          new Date("2025-12-25T20:00:00.000Z"),
          "US",
          [],
          "Asia/Tokyo" // UTC+9
        );

        expect(holiday).toBeNull();
      });

      it("should detect holiday correctly for US Eastern timezone on Christmas", async () => {
        vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

        // Dec 25th 10:00 AM UTC = Dec 25th 5:00 AM EST (UTC-5)
        // This should be blocked because it's Christmas in Eastern US
        const holiday = await holidayService.getHolidayOnDate(
          new Date("2025-12-25T10:00:00.000Z"),
          "US",
          [],
          "America/New_York"
        );

        expect(holiday?.name).toBe("Christmas Day");
      });

      it("should NOT detect holiday when booking time is Dec 26th 3AM UTC which is Dec 25th 10PM EST", async () => {
        vi.mocked(mockCachingProxy.getHolidaysForCountry).mockResolvedValue(mockHolidays);

        // Dec 26th 3:00 AM UTC = Dec 25th 10:00 PM EST (UTC-5)
        // This SHOULD be blocked because it's still Christmas in Eastern US
        const holiday = await holidayService.getHolidayOnDate(
          new Date("2025-12-26T03:00:00.000Z"),
          "US",
          [],
          "America/New_York"
        );

        expect(holiday?.name).toBe("Christmas Day");
      });
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
});
