import { afterEach, describe, expect, it, vi } from "vitest";
import { getAvailableDatesInMonth } from "./getAvailableDatesInMonth";

describe("getAvailableDatesInMonth expansion tests", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fn: getAvailableDatesInMonth", () => {
    it("should return all days of a future month", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-01-15T12:00:00Z"));

      const browsingDate = new Date("2024-03-01T00:00:00Z");
      const result = getAvailableDatesInMonth({ browsingDate });

      expect(result).toHaveLength(31); // March has 31 days
      expect(result[0]).toBe("2024-03-01");
      expect(result[30]).toBe("2024-03-31");
    });

    it("should handle February in a leap year", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const browsingDate = new Date("2024-02-01T00:00:00Z");
      const result = getAvailableDatesInMonth({ browsingDate });

      expect(result).toHaveLength(29); // 2024 is a leap year
      expect(result[result.length - 1]).toBe("2024-02-29");
    });

    it("should handle February in a non-leap year", () => {
      vi.useFakeTimers().setSystemTime(new Date("2023-01-01T12:00:00Z"));

      const browsingDate = new Date("2023-02-01T00:00:00Z");
      const result = getAvailableDatesInMonth({ browsingDate });

      expect(result).toHaveLength(28);
      expect(result[result.length - 1]).toBe("2023-02-28");
    });

    it("should exclude past dates in the current month", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-06-15T12:00:00Z"));

      const browsingDate = new Date("2024-06-01T00:00:00Z");
      const result = getAvailableDatesInMonth({ browsingDate });

      // Should have dates from June 15 to June 30 = 16 days
      expect(result).toHaveLength(16);
      expect(result[0]).toBe("2024-06-15");
      expect(result[result.length - 1]).toBe("2024-06-30");
    });

    it("should return only included dates when provided", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const browsingDate = new Date("2024-03-01T00:00:00Z");
      const includedDates = ["2024-03-05", "2024-03-10", "2024-03-20"];
      const result = getAvailableDatesInMonth({ browsingDate, includedDates });

      expect(result).toHaveLength(3);
      expect(result).toEqual(["2024-03-05", "2024-03-10", "2024-03-20"]);
    });

    it("should intersect included dates with available dates (exclude past included dates)", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-06-15T12:00:00Z"));

      const browsingDate = new Date("2024-06-01T00:00:00Z");
      const includedDates = ["2024-06-10", "2024-06-15", "2024-06-20"];
      const result = getAvailableDatesInMonth({ browsingDate, includedDates });

      // June 10 is in the past, so only 15 and 20
      expect(result).toHaveLength(2);
      expect(result).toEqual(["2024-06-15", "2024-06-20"]);
    });

    it("should return empty array when all included dates are in the past", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-06-20T12:00:00Z"));

      const browsingDate = new Date("2024-06-01T00:00:00Z");
      const includedDates = ["2024-06-05", "2024-06-10"];
      const result = getAvailableDatesInMonth({ browsingDate, includedDates });

      expect(result).toHaveLength(0);
    });

    it("should return single date on the last day of the month", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-06-30T12:00:00Z"));

      const browsingDate = new Date("2024-06-01T00:00:00Z");
      const result = getAvailableDatesInMonth({ browsingDate });

      expect(result).toHaveLength(1);
      expect(result[0]).toBe("2024-06-30");
    });

    it("should use custom minDate instead of current date", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const browsingDate = new Date("2024-03-01T00:00:00Z");
      const minDate = new Date("2024-03-10T00:00:00Z");
      const result = getAvailableDatesInMonth({ browsingDate, minDate });

      expect(result).toHaveLength(22); // March 10-31
      expect(result[0]).toBe("2024-03-10");
    });

    it("should return empty when minDate is after end of month", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const browsingDate = new Date("2024-03-01T00:00:00Z");
      const minDate = new Date("2024-04-01T00:00:00Z");
      const result = getAvailableDatesInMonth({ browsingDate, minDate });

      expect(result).toHaveLength(0);
    });

    it("should handle months with 30 days correctly", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const browsingDate = new Date("2024-04-01T00:00:00Z"); // April
      const result = getAvailableDatesInMonth({ browsingDate });

      expect(result).toHaveLength(30);
      expect(result[result.length - 1]).toBe("2024-04-30");
    });

    it("should handle included dates that dont exist in month", () => {
      vi.useFakeTimers().setSystemTime(new Date("2024-01-01T12:00:00Z"));

      const browsingDate = new Date("2024-03-01T00:00:00Z");
      const includedDates = ["2024-04-05"]; // April date for a March browsing
      const result = getAvailableDatesInMonth({ browsingDate, includedDates });

      expect(result).toHaveLength(0);
    });
  });
});
