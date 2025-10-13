import { describe, expect, it } from "vitest";

import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { getPrefetchMonthCount } from "./getPrefetchMonthCount";

describe("getPrefetchMonthCount", () => {
  describe("COLUMN_VIEW layout", () => {
    it("should return 2 when months are different", () => {
      const result = getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_date", 1, 2);
      expect(result).toBe(2);
    });

    it("should return undefined when months are the same", () => {
      const result = getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_date", 5, 5);
      expect(result).toBe(undefined);
    });

    it("should return 2 regardless of bookerState when months are different", () => {
      expect(getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_time", 3, 4)).toBe(2);
      expect(getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "booking", 7, 8)).toBe(2);
    });
  });

  describe("WEEK_VIEW layout", () => {
    it("should return undefined when state is selecting_time", () => {
      const result = getPrefetchMonthCount(BookerLayouts.WEEK_VIEW, "selecting_time", 1, 2);
      expect(result).toBe(undefined);
    });

    it("should return undefined when state is not selecting_time", () => {
      const result = getPrefetchMonthCount(BookerLayouts.WEEK_VIEW, "selecting_date", 1, 2);
      expect(result).toBe(undefined);
    });

    it("should return undefined even with different months", () => {
      const result = getPrefetchMonthCount(BookerLayouts.WEEK_VIEW, "booking", 0, 11);
      expect(result).toBe(undefined);
    });
  });

  describe("MONTH_VIEW layout with selecting_time state", () => {
    it("should return 2 when months are different", () => {
      const result = getPrefetchMonthCount(BookerLayouts.MONTH_VIEW, "selecting_time", 3, 4);
      expect(result).toBe(2);
    });

    it("should return undefined when months are the same", () => {
      const result = getPrefetchMonthCount(BookerLayouts.MONTH_VIEW, "selecting_time", 6, 6);
      expect(result).toBe(undefined);
    });
  });

  describe("MONTH_VIEW layout with other states", () => {
    it("should return undefined when state is selecting_date", () => {
      const result = getPrefetchMonthCount(BookerLayouts.MONTH_VIEW, "selecting_date", 1, 2);
      expect(result).toBe(undefined);
    });

    it("should return undefined when state is booking", () => {
      const result = getPrefetchMonthCount(BookerLayouts.MONTH_VIEW, "booking", 1, 2);
      expect(result).toBe(undefined);
    });
  });

  describe("invalid month inputs", () => {
    it("should return undefined when first month is NaN", () => {
      const result = getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_date", NaN, 5);
      expect(result).toBe(undefined);
    });

    it("should return undefined when second month is NaN", () => {
      const result = getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_date", 5, NaN);
      expect(result).toBe(undefined);
    });

    it("should return undefined when both months are invalid", () => {
      const result = getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_time", Infinity, -Infinity);
      expect(result).toBe(undefined);
    });
  });

  describe("edge cases", () => {
    it("should handle month transitions (11 to 0)", () => {
      const result = getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_date", 11, 0);
      expect(result).toBe(2);
    });

    it("should handle negative month numbers if they are different", () => {
      const result = getPrefetchMonthCount(BookerLayouts.COLUMN_VIEW, "selecting_date", -1, 5);
      expect(result).toBe(2);
    });
  });
});
