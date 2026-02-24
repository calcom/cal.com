import { describe, expect, it } from "vitest";
import { validateIntervalLimitOrder } from "./validateIntervalLimitOrder";

describe("validateIntervalLimitOrder", () => {
  it("returns true when limits are in ascending order", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 1, PER_WEEK: 5, PER_MONTH: 20, PER_YEAR: 100 })).toBe(true);
  });

  it("returns false when limits are out of order", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 100, PER_WEEK: 5 })).toBe(false);
  });

  it("returns true for a single limit key", () => {
    expect(validateIntervalLimitOrder({ PER_MONTH: 10 })).toBe(true);
  });

  it("returns true for a subset of keys in correct order", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 2, PER_YEAR: 50 })).toBe(true);
  });

  it("returns false when day exceeds week", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 10, PER_WEEK: 5 })).toBe(false);
  });

  it("returns false when week exceeds month", () => {
    expect(validateIntervalLimitOrder({ PER_WEEK: 30, PER_MONTH: 10 })).toBe(false);
  });

  it("returns true when all values are equal", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 5, PER_WEEK: 5, PER_MONTH: 5 })).toBe(true);
  });

  it("returns true for an empty object", () => {
    expect(validateIntervalLimitOrder({})).toBe(true);
  });
});
