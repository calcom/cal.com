import { describe, expect, it } from "vitest";

import type { IntervalLimit } from "./intervalLimitSchema";
import { validateIntervalLimitOrder } from "./validateIntervalLimitOrder";

describe("fn: validateIntervalLimitOrder", () => {
  it("should accept limits that ascend with the interval", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 1, PER_WEEK: 2, PER_MONTH: 3, PER_YEAR: 4 })).toBe(true);
    expect(validateIntervalLimitOrder({ PER_DAY: 3, PER_MONTH: 5 })).toBe(true);
    expect(validateIntervalLimitOrder({ PER_DAY: 9, PER_YEAR: 25 })).toBe(true);
  });

  it("should reject a smaller interval carrying a larger limit", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 60, PER_WEEK: 30 })).toBe(false);
    expect(validateIntervalLimitOrder({ PER_DAY: 9, PER_MONTH: 5 })).toBe(false);
    expect(validateIntervalLimitOrder({ PER_WEEK: 10, PER_MONTH: 10, PER_YEAR: 1 })).toBe(false);
  });

  it("should accept an empty or single limit", () => {
    expect(validateIntervalLimitOrder({})).toBe(true);
    expect(validateIntervalLimitOrder({ PER_WEEK: 5 })).toBe(true);
  });

  it("should not depend on key insertion order", () => {
    // Every permutation of the same limits must give the same verdict. The
    // previous implementation sorted by value and let Array.sort's stability
    // decide the tie, so the object literal's key order changed the answer.
    const permutations: IntervalLimit[] = [
      { PER_DAY: 5, PER_WEEK: 5 },
      { PER_WEEK: 5, PER_DAY: 5 },
    ];

    for (const limits of permutations) {
      expect(validateIntervalLimitOrder(limits), JSON.stringify(limits)).toBe(true);
    }

    const invalid: IntervalLimit[] = [
      { PER_DAY: 9, PER_WEEK: 2 },
      { PER_WEEK: 2, PER_DAY: 9 },
    ];

    for (const limits of invalid) {
      expect(validateIntervalLimitOrder(limits), JSON.stringify(limits)).toBe(false);
    }
  });

  it("should accept equal limits across every interval", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 1, PER_YEAR: 1 })).toBe(true);
    expect(validateIntervalLimitOrder({ PER_DAY: 1, PER_YEAR: 1, PER_WEEK: 1, PER_MONTH: 1 })).toBe(true);
    expect(validateIntervalLimitOrder({ PER_YEAR: 5, PER_MONTH: 5, PER_WEEK: 5, PER_DAY: 5 })).toBe(true);
  });

  it("should survive the unit-flip round trip the limits UI performs", () => {
    // EventLimitsTab re-inserts the key at the end of the object when a row's
    // unit changes, so flipping a unit and flipping it back reorders the keys
    // while leaving the limits identical.
    let limits: IntervalLimit = { PER_DAY: 5, PER_WEEK: 5 };
    expect(validateIntervalLimitOrder(limits)).toBe(true);

    const flip = (from: keyof IntervalLimit, to: keyof IntervalLimit, current: IntervalLimit) => {
      const next = { ...current };
      const value = next[from];
      delete next[from];
      return { ...next, [to]: value };
    };

    limits = flip("PER_DAY", "PER_MONTH", limits);
    expect(validateIntervalLimitOrder(limits)).toBe(true);

    limits = flip("PER_MONTH", "PER_DAY", limits);
    expect(Object.keys(limits)).toEqual(["PER_WEEK", "PER_DAY"]);
    expect(validateIntervalLimitOrder(limits)).toBe(true);
  });

  it("should ignore keys that are explicitly undefined", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 9, PER_WEEK: undefined, PER_MONTH: 20 })).toBe(true);
  });
});
