import { describe, expect, it } from "vitest";

import { isMonthChange } from "./isMonthChange";

describe("isMonthChange", () => {
  describe("when months are different", () => {
    it("should return true for consecutive months", () => {
      expect(isMonthChange(0, 1)).toBe(true);
      expect(isMonthChange(5, 6)).toBe(true);
      expect(isMonthChange(10, 11)).toBe(true);
    });

    it("should return true for non-consecutive months", () => {
      expect(isMonthChange(0, 11)).toBe(true);
      expect(isMonthChange(3, 9)).toBe(true);
    });

    it("should return true for year transition (11 to 0)", () => {
      expect(isMonthChange(11, 0)).toBe(true);
    });
  });

  describe("when months are the same", () => {
    it("should return false for same month values", () => {
      expect(isMonthChange(0, 0)).toBe(false);
      expect(isMonthChange(5, 5)).toBe(false);
      expect(isMonthChange(11, 11)).toBe(false);
    });
  });

  describe("when inputs are invalid", () => {
    it("should return false when currentMonth is NaN", () => {
      expect(isMonthChange(NaN, 5)).toBe(false);
    });

    it("should return false when nextMonth is NaN", () => {
      expect(isMonthChange(5, NaN)).toBe(false);
    });

    it("should return false when both inputs are NaN", () => {
      expect(isMonthChange(NaN, NaN)).toBe(false);
    });
  });
});
