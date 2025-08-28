import { describe, it, expect } from "vitest";

import { validateIntervalLimitOrder } from "./validateIntervalLimitOrder";

describe("validateIntervalLimitOrder", () => {
  it("should return true for valid ascending order", () => {
    const validLimits = {
      PER_DAY: 1,
      PER_WEEK: 5,
      PER_MONTH: 20,
      PER_YEAR: 100,
    };
    expect(validateIntervalLimitOrder(validLimits)).toBe(true);
  });

  it("should return false for invalid descending order", () => {
    const invalidLimits = {
      PER_DAY: 10,
      PER_WEEK: 5,
      PER_MONTH: 20,
      PER_YEAR: 100,
    };
    expect(validateIntervalLimitOrder(invalidLimits)).toBe(false);
  });

  it("should return true for partial valid limits", () => {
    const partialLimits = {
      PER_DAY: 2,
      PER_MONTH: 10,
    };
    expect(validateIntervalLimitOrder(partialLimits)).toBe(true);
  });

  it("should return false for partial invalid limits", () => {
    const partialInvalidLimits = {
      PER_WEEK: 10,
      PER_DAY: 15,
    };
    expect(validateIntervalLimitOrder(partialInvalidLimits)).toBe(false);
  });
});
