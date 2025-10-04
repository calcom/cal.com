import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { isPrefetchNextMonthEnabled } from "./isPrefetchNextMonthEnabled";

describe("isPrefetchNextMonthEnabled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("WEEK_VIEW layout", () => {
    it("should return true when date is in the last week of month", () => {
      const result = isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2024-01-28", "2024-01-01");
      expect(result).toBe(true);
    });

    it("should return false when date is not in the last week of month", () => {
      const result = isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2024-01-15", "2024-01-01");
      expect(result).toBe(false);
    });

    it("should work for different months", () => {
      expect(isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2024-02-25", "2024-02-01")).toBe(true);
      expect(isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2024-06-10", "2024-06-01")).toBe(false);
    });
  });

  describe("COLUMN_VIEW layout", () => {
    it("should return true when date is in the last week of month", () => {
      const result = isPrefetchNextMonthEnabled(BookerLayouts.COLUMN_VIEW, "2024-01-30", "2024-01-01");
      expect(result).toBe(true);
    });

    it("should return false when date is not in the last week of month", () => {
      const result = isPrefetchNextMonthEnabled(BookerLayouts.COLUMN_VIEW, "2024-01-10", "2024-01-01");
      expect(result).toBe(false);
    });
  });

  describe("MONTH_VIEW layout", () => {
    it("should return true when conditions for month view prefetch are met", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      const result = isPrefetchNextMonthEnabled(BookerLayouts.MONTH_VIEW, "invalid-date", "2024-01-01");
      expect(result).toBe(true);
    });

    it("should return false when current time is before 2 weeks threshold", () => {
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));

      const result = isPrefetchNextMonthEnabled(BookerLayouts.MONTH_VIEW, "invalid-date", "2024-01-01");
      expect(result).toBe(false);
    });

    it("should return false when date is valid and different month", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      const result = isPrefetchNextMonthEnabled(BookerLayouts.MONTH_VIEW, "2024-02-15", "2024-02-01");
      expect(result).toBe(false);
    });
  });

  describe("mobile layout", () => {
    it("should return true when conditions for month view prefetch are met", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      const result = isPrefetchNextMonthEnabled("mobile", "invalid-date", "2024-01-01");
      expect(result).toBe(true);
    });

    it("should return false when current time is before 2 weeks threshold", () => {
      vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));

      const result = isPrefetchNextMonthEnabled("mobile", "2024-02-15", "2024-01-01");
      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle null month parameter for WEEK_VIEW", () => {
      const result = isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2024-01-28", null);
      expect(result).toBe(true);
    });

    it("should handle null month parameter for MONTH_VIEW", () => {
      vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));

      const result = isPrefetchNextMonthEnabled(BookerLayouts.MONTH_VIEW, "invalid-date", null);
      expect(typeof result).toBe("boolean");
    });

    it("should work with leap year February dates for WEEK_VIEW", () => {
      expect(isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2024-02-25", "2024-02-01")).toBe(true);
      expect(isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2024-02-29", "2024-02-01")).toBe(true);
    });

    it("should work with non-leap year February dates for WEEK_VIEW", () => {
      expect(isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2025-02-23", "2025-02-01")).toBe(true);
      expect(isPrefetchNextMonthEnabled(BookerLayouts.WEEK_VIEW, "2025-02-28", "2025-02-01")).toBe(true);
    });
  });
});
