import { describe, expect, it } from "vitest";

import { areDifferentValidMonths } from "./areDifferentValidMonths";

describe("areDifferentValidMonths", () => {
  describe("valid different months", () => {
    it("should return true for different valid month numbers", () => {
      expect(areDifferentValidMonths(0, 1)).toBe(true);
      expect(areDifferentValidMonths(5, 10)).toBe(true);
      expect(areDifferentValidMonths(11, 0)).toBe(true);
    });
  });

  describe("same month numbers", () => {
    it("should return false for identical month numbers", () => {
      expect(areDifferentValidMonths(0, 0)).toBe(false);
      expect(areDifferentValidMonths(6, 6)).toBe(false);
      expect(areDifferentValidMonths(11, 11)).toBe(false);
    });
  });

  describe("invalid inputs", () => {
    it("should return false for NaN values", () => {
      expect(areDifferentValidMonths(NaN, 5)).toBe(false);
      expect(areDifferentValidMonths(5, NaN)).toBe(false);
      expect(areDifferentValidMonths(NaN, NaN)).toBe(false);
    });

    it("should return false for Infinity values", () => {
      expect(areDifferentValidMonths(Infinity, 5)).toBe(false);
      expect(areDifferentValidMonths(5, Infinity)).toBe(false);
      expect(areDifferentValidMonths(Infinity, Infinity)).toBe(false);
    });

    it("should return false for -Infinity values", () => {
      expect(areDifferentValidMonths(-Infinity, 5)).toBe(false);
      expect(areDifferentValidMonths(5, -Infinity)).toBe(false);
      expect(areDifferentValidMonths(-Infinity, -Infinity)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle negative month numbers correctly", () => {
      expect(areDifferentValidMonths(-1, 5)).toBe(true);
      expect(areDifferentValidMonths(-1, -1)).toBe(false);
    });

    it("should handle month numbers beyond 11", () => {
      expect(areDifferentValidMonths(12, 5)).toBe(true);
      expect(areDifferentValidMonths(100, 200)).toBe(true);
    });
  });
});
