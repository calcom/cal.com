import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { isMonthViewPrefetchEnabled } from "./isMonthViewPrefetchEnabled";

describe("isMonthViewPrefetchEnabled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when current time is after 2 weeks into the month", () => {
    it("should return true when date is invalid and same month", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      expect(isMonthViewPrefetchEnabled("invalid-date", "2024-01-01")).toBe(true);
    });

    it("should return true when date is valid but same month", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      expect(isMonthViewPrefetchEnabled("2024-02-15", "2024-01-01")).toBe(true);
    });

    it("should return false when date is valid and different month", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      expect(isMonthViewPrefetchEnabled("2024-02-15", "2024-02-01")).toBe(false);
    });
  });

  describe("when current time is before 2 weeks threshold", () => {
    it("should return false regardless of date validity", () => {
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));

      expect(isMonthViewPrefetchEnabled("invalid-date", "2024-01-01")).toBe(false);
      expect(isMonthViewPrefetchEnabled("2024-02-15", "2024-01-01")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle null month parameter", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      const result = isMonthViewPrefetchEnabled("2024-02-15", null);
      expect(result).toBe(false);
    });

    it("should handle exactly at 2 weeks threshold", () => {
      vi.setSystemTime(new Date("2024-01-15T00:00:00Z"));

      const result = isMonthViewPrefetchEnabled("invalid-date", "2024-01-01");
      expect(result).toBe(false);
    });

    it("should work with different months throughout the year", () => {
      vi.setSystemTime(new Date("2024-06-20T12:00:00Z"));

      expect(isMonthViewPrefetchEnabled("invalid-date", "2024-06-01")).toBe(true);
      expect(isMonthViewPrefetchEnabled("2024-07-15", "2024-06-01")).toBe(true);
    });
  });
});
