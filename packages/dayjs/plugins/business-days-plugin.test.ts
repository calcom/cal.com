import dayjs from "dayjs";
import { describe, expect, it, beforeEach } from "vitest";

import BusinessDaysPlugin from "./business-days-plugin";

// Extend dayjs with the plugin
dayjs.extend(BusinessDaysPlugin);

describe("BusinessDaysPlugin", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    dayjs.setWorkingWeekdays([1, 2, 3, 4, 5]);
    dayjs.setHolidays([]);
    dayjs.setHolidayFormat("YYYY-MM-DD");
    dayjs.setAdditionalWorkingDays([]);
    dayjs.setAdditionalWorkingDayFormat("YYYY-MM-DD");
  });

  describe("configuration", () => {
    it("gets and sets working weekdays", () => {
      expect(dayjs.getWorkingWeekdays()).toEqual([1, 2, 3, 4, 5]);
      dayjs.setWorkingWeekdays([1, 2, 3, 4]);
      expect(dayjs.getWorkingWeekdays()).toEqual([1, 2, 3, 4]);
    });

    it("gets and sets holidays", () => {
      expect(dayjs.getHolidays()).toEqual([]);
      dayjs.setHolidays(["2025-12-25", "2025-01-01"]);
      expect(dayjs.getHolidays()).toEqual(["2025-12-25", "2025-01-01"]);
    });

    it("gets and sets holiday format", () => {
      dayjs.setHolidayFormat("MM-DD");
      expect(dayjs.getHolidayFormat()).toBe("MM-DD");
    });

    it("gets and sets additional working days", () => {
      expect(dayjs.getAdditionalWorkingDays()).toEqual([]);
      dayjs.setAdditionalWorkingDays(["2025-12-27"]);
      expect(dayjs.getAdditionalWorkingDays()).toEqual(["2025-12-27"]);
    });

    it("gets and sets additional working day format", () => {
      dayjs.setAdditionalWorkingDayFormat("MM-DD");
      expect(dayjs.getAdditionalWorkingDayFormat()).toBe("MM-DD");
    });
  });

  describe("isHoliday", () => {
    it("returns false when no holidays are set", () => {
      expect(dayjs("2025-12-25").isHoliday()).toBe(false);
    });

    it("returns true when date is a holiday", () => {
      dayjs.setHolidays(["2025-12-25"]);
      dayjs.setHolidayFormat("YYYY-MM-DD");
      expect(dayjs("2025-12-25").isHoliday()).toBe(true);
    });

    it("returns false when date is not a holiday", () => {
      dayjs.setHolidays(["2025-12-25"]);
      dayjs.setHolidayFormat("YYYY-MM-DD");
      expect(dayjs("2025-12-26").isHoliday()).toBe(false);
    });
  });

  describe("isBusinessDay", () => {
    it("returns true for weekdays (Mon-Fri)", () => {
      // 2025-12-01 is Monday
      expect(dayjs("2025-12-01").isBusinessDay()).toBe(true);
      // 2025-12-05 is Friday
      expect(dayjs("2025-12-05").isBusinessDay()).toBe(true);
    });

    it("returns false for weekends", () => {
      // 2025-12-06 is Saturday
      expect(dayjs("2025-12-06").isBusinessDay()).toBe(false);
      // 2025-12-07 is Sunday
      expect(dayjs("2025-12-07").isBusinessDay()).toBe(false);
    });

    it("returns false for holidays even if on a weekday", () => {
      dayjs.setHolidays(["2025-12-25"]);
      dayjs.setHolidayFormat("YYYY-MM-DD");
      // 2025-12-25 is Thursday
      expect(dayjs("2025-12-25").isBusinessDay()).toBe(false);
    });

    it("returns true for additional working days even on weekends", () => {
      dayjs.setAdditionalWorkingDays(["2025-12-06"]);
      dayjs.setAdditionalWorkingDayFormat("YYYY-MM-DD");
      // 2025-12-06 is Saturday
      expect(dayjs("2025-12-06").isBusinessDay()).toBe(true);
    });
  });

  describe("isAdditionalWorkingDay", () => {
    it("returns false when no additional working days are set", () => {
      expect(dayjs("2025-12-06").isAdditionalWorkingDay()).toBe(false);
    });

    it("returns true for additional working days", () => {
      dayjs.setAdditionalWorkingDays(["2025-12-06"]);
      dayjs.setAdditionalWorkingDayFormat("YYYY-MM-DD");
      expect(dayjs("2025-12-06").isAdditionalWorkingDay()).toBe(true);
    });
  });

  describe("businessDaysAdd", () => {
    it("adds business days correctly", () => {
      // 2025-12-01 is Monday, add 5 business days = 2025-12-08 (next Monday)
      const result = dayjs("2025-12-01").businessDaysAdd(5);
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-08");
    });

    it("skips weekends when adding days", () => {
      // 2025-12-05 is Friday, add 1 business day = 2025-12-08 (Monday)
      const result = dayjs("2025-12-05").businessDaysAdd(1);
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-08");
    });

    it("handles negative days (subtracts business days)", () => {
      // 2025-12-08 is Monday, subtract 1 business day = 2025-12-05 (Friday)
      const result = dayjs("2025-12-08").businessDaysAdd(-1);
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-05");
    });

    it("skips holidays when adding days", () => {
      dayjs.setHolidays(["2025-12-08"]);
      dayjs.setHolidayFormat("YYYY-MM-DD");
      // 2025-12-05 is Friday, next business day should skip Mon holiday -> Tue
      const result = dayjs("2025-12-05").businessDaysAdd(1);
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-09");
    });
  });

  describe("businessDaysSubtract", () => {
    it("subtracts business days correctly", () => {
      // 2025-12-08 is Monday, subtract 5 business days = 2025-12-01 (prev Monday)
      const result = dayjs("2025-12-08").businessDaysSubtract(5);
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-01");
    });

    it("skips weekends when subtracting", () => {
      // 2025-12-08 is Monday, subtract 1 = 2025-12-05 (Friday)
      const result = dayjs("2025-12-08").businessDaysSubtract(1);
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-05");
    });
  });

  describe("businessDiff", () => {
    it("counts business days between two dates", () => {
      // Mon Dec 1 to Fri Dec 5 = 4 business days
      const diff = dayjs("2025-12-05").businessDiff(dayjs("2025-12-01"));
      expect(diff).toBe(4);
    });

    it("returns 0 for same date", () => {
      const diff = dayjs("2025-12-01").businessDiff(dayjs("2025-12-01"));
      expect(diff).toBe(0);
    });

    it("returns negative count when first date is before second", () => {
      const diff = dayjs("2025-12-01").businessDiff(dayjs("2025-12-05"));
      expect(diff).toBe(-4);
    });

    it("counts across a weekend correctly", () => {
      // Mon Dec 1 to Mon Dec 8 = 5 business days
      const diff = dayjs("2025-12-08").businessDiff(dayjs("2025-12-01"));
      expect(diff).toBe(5);
    });
  });

  describe("nextBusinessDay", () => {
    it("returns next Monday from Friday", () => {
      const result = dayjs("2025-12-05").nextBusinessDay();
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-08");
    });

    it("returns next weekday from a regular weekday", () => {
      const result = dayjs("2025-12-01").nextBusinessDay();
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-02");
    });

    it("skips holidays", () => {
      dayjs.setHolidays(["2025-12-02"]);
      dayjs.setHolidayFormat("YYYY-MM-DD");
      const result = dayjs("2025-12-01").nextBusinessDay();
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-03");
    });
  });

  describe("prevBusinessDay", () => {
    it("returns previous Friday from Monday", () => {
      const result = dayjs("2025-12-08").prevBusinessDay();
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-05");
    });

    it("returns previous weekday from a regular weekday", () => {
      const result = dayjs("2025-12-03").prevBusinessDay();
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-02");
    });
  });

  describe("businessDaysInMonth", () => {
    it("returns all business days in a month", () => {
      // December 2025 has 23 business days (Mon-Fri, no holidays)
      const businessDays = dayjs("2025-12-01").businessDaysInMonth();
      expect(businessDays.length).toBe(23);
    });

    it("excludes holidays from business days in month", () => {
      dayjs.setHolidays(["2025-12-25"]);
      dayjs.setHolidayFormat("YYYY-MM-DD");
      const businessDays = dayjs("2025-12-01").businessDaysInMonth();
      expect(businessDays.length).toBe(22);
    });

    it("returns empty array for invalid date", () => {
      const businessDays = dayjs("invalid").businessDaysInMonth();
      expect(businessDays).toEqual([]);
    });
  });

  describe("lastBusinessDayOfMonth", () => {
    it("returns last business day of the month", () => {
      // Last business day of Dec 2025 is Wed Dec 31
      const result = dayjs("2025-12-01").lastBusinessDayOfMonth();
      expect(result.format("YYYY-MM-DD")).toBe("2025-12-31");
    });
  });

  describe("businessWeeksInMonth", () => {
    it("returns business weeks grouped correctly", () => {
      const weeks = dayjs("2025-12-01").businessWeeksInMonth();
      expect(weeks.length).toBeGreaterThan(0);
      // Each week should have business days
      for (const week of weeks) {
        for (const day of week) {
          expect(day.isBusinessDay()).toBe(true);
        }
      }
    });

    it("returns empty array for invalid date", () => {
      const weeks = dayjs("invalid").businessWeeksInMonth();
      expect(weeks).toEqual([]);
    });
  });
});
