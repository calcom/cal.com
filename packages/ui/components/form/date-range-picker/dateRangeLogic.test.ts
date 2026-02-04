import { describe, it, expect } from "vitest";

import { calculateNewDateRange } from "./dateRangeLogic";

describe("calculateNewDateRange", () => {
  // Helper dates for testing
  const date1 = new Date("2024-01-01");
  const date2 = new Date("2024-01-10");
  const date3 = new Date("2024-01-20");
  const date4 = new Date("2024-01-05"); // Between date1 and date2

  describe("Airbnb-style date range selection", () => {
    it("should start a new range when no start date is set", () => {
      const result = calculateNewDateRange({
        startDate: undefined,
        endDate: undefined,
        clickedDate: date1,
      });

      expect(result).toEqual({
        startDate: date1,
        endDate: undefined,
      });
    });

    it("should start a new range when both dates are already set", () => {
      const result = calculateNewDateRange({
        startDate: date1,
        endDate: date2,
        clickedDate: date3,
      });

      expect(result).toEqual({
        startDate: date3,
        endDate: undefined,
      });
    });

    it("should complete the range when only start date is set (clicked date is after start)", () => {
      const result = calculateNewDateRange({
        startDate: date1,
        endDate: undefined,
        clickedDate: date2,
      });

      expect(result).toEqual({
        startDate: date1,
        endDate: date2,
      });
    });

    it("should complete the range and swap dates when clicked date is before start date", () => {
      const result = calculateNewDateRange({
        startDate: date2,
        endDate: undefined,
        clickedDate: date1,
      });

      expect(result).toEqual({
        startDate: date1,
        endDate: date2,
      });
    });

    it("should handle same date click when only start date is set", () => {
      const result = calculateNewDateRange({
        startDate: date1,
        endDate: undefined,
        clickedDate: date1,
      });

      expect(result).toEqual({
        startDate: date1,
        endDate: date1,
      });
    });

    it("should handle clicking a date between start and end when range is complete", () => {
      const result = calculateNewDateRange({
        startDate: date1,
        endDate: date2,
        clickedDate: date4,
      });

      expect(result).toEqual({
        startDate: date4,
        endDate: undefined,
      });
    });

    it("should reset range when clicking any date after both dates are set", () => {
      const result = calculateNewDateRange({
        startDate: date1,
        endDate: date2,
        clickedDate: date1, // Click same as start
      });

      expect(result).toEqual({
        startDate: date1,
        endDate: undefined,
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle dates with different times on same day", () => {
      const morning = new Date("2024-01-01T08:00:00");
      const evening = new Date("2024-01-01T20:00:00");

      const result = calculateNewDateRange({
        startDate: morning,
        endDate: undefined,
        clickedDate: evening,
      });

      expect(result).toEqual({
        startDate: morning,
        endDate: evening,
      });
    });

    it("should maintain immutability - not modify input dates", () => {
      const originalStart = new Date("2024-01-01");
      const originalEnd = new Date("2024-01-10");
      const clickedDate = new Date("2024-01-15");

      calculateNewDateRange({
        startDate: originalStart,
        endDate: originalEnd,
        clickedDate,
      });

      // Original dates should not be modified
      expect(originalStart.toISOString()).toBe(new Date("2024-01-01").toISOString());
      expect(originalEnd.toISOString()).toBe(new Date("2024-01-10").toISOString());
    });

    it("should handle selecting dates in reverse order", () => {
      // First click - set start
      const result1 = calculateNewDateRange({
        startDate: undefined,
        endDate: undefined,
        clickedDate: date2,
      });

      expect(result1).toEqual({
        startDate: date2,
        endDate: undefined,
      });

      // Second click - click earlier date, should swap
      const result2 = calculateNewDateRange({
        startDate: result1.startDate,
        endDate: result1.endDate,
        clickedDate: date1,
      });

      expect(result2).toEqual({
        startDate: date1,
        endDate: date2,
      });
    });

    it("should start fresh after completing a range", () => {
      // Complete a range
      const result1 = calculateNewDateRange({
        startDate: date1,
        endDate: date2,
        clickedDate: date3, // This should reset
      });

      expect(result1).toEqual({
        startDate: date3,
        endDate: undefined,
      });

      // Should be able to complete the new range
      const result2 = calculateNewDateRange({
        startDate: result1.startDate,
        endDate: result1.endDate,
        clickedDate: date2,
      });

      expect(result2).toEqual({
        startDate: date2,
        endDate: date3,
      });
    });
  });
});
