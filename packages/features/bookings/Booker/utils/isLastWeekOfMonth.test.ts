import { describe, expect, it } from "vitest";

import { isLastWeekOfMonth } from "./isLastWeekOfMonth";

describe("isLastWeekOfMonth", () => {
  describe("dates in last week of month", () => {
    it("should return true for dates where end of week crosses into next month", () => {
      expect(isLastWeekOfMonth("2024-01-28")).toBe(true);
      expect(isLastWeekOfMonth("2024-01-29")).toBe(true);
      expect(isLastWeekOfMonth("2024-01-30")).toBe(true);
      expect(isLastWeekOfMonth("2024-01-31")).toBe(true);
    });

    it("should return true for last days of 30-day months", () => {
      expect(isLastWeekOfMonth("2024-04-28")).toBe(true);
      expect(isLastWeekOfMonth("2024-04-29")).toBe(true);
      expect(isLastWeekOfMonth("2024-04-30")).toBe(true);
    });

    it("should return true for last days of February in leap year", () => {
      expect(isLastWeekOfMonth("2024-02-25")).toBe(true);
      expect(isLastWeekOfMonth("2024-02-26")).toBe(true);
      expect(isLastWeekOfMonth("2024-02-29")).toBe(true);
    });

    it("should return true for last days of February in non-leap year", () => {
      expect(isLastWeekOfMonth("2025-02-23")).toBe(true);
      expect(isLastWeekOfMonth("2025-02-24")).toBe(true);
      expect(isLastWeekOfMonth("2025-02-28")).toBe(true);
    });
  });

  describe("dates NOT in last week of month", () => {
    it("should return false for dates in the middle of the month", () => {
      expect(isLastWeekOfMonth("2024-01-15")).toBe(false);
      expect(isLastWeekOfMonth("2024-06-10")).toBe(false);
      expect(isLastWeekOfMonth("2024-12-12")).toBe(false);
    });

    it("should return false for dates at the beginning of the month", () => {
      expect(isLastWeekOfMonth("2024-01-01")).toBe(false);
      expect(isLastWeekOfMonth("2024-03-05")).toBe(false);
      expect(isLastWeekOfMonth("2024-07-02")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle dates in different months correctly", () => {
      expect(isLastWeekOfMonth("2024-12-29")).toBe(true);
      expect(isLastWeekOfMonth("2024-12-31")).toBe(true);
    });

    it("should handle invalid date strings", () => {
      const result = isLastWeekOfMonth("invalid-date");
      expect(result).toBe(true);
    });
  });
});
