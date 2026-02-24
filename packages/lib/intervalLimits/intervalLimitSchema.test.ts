import { describe, expect, it } from "vitest";
import { intervalLimitsType } from "./intervalLimitSchema";

describe("intervalLimitsType", () => {
  it("parses a valid object with all keys", () => {
    const result = intervalLimitsType.safeParse({
      PER_DAY: 5,
      PER_WEEK: 10,
      PER_MONTH: 20,
      PER_YEAR: 100,
    });
    expect(result.success).toBe(true);
  });

  it("parses a valid object with a subset of keys", () => {
    expect(intervalLimitsType.safeParse({ PER_DAY: 3 }).success).toBe(true);
    expect(intervalLimitsType.safeParse({ PER_WEEK: 7, PER_YEAR: 50 }).success).toBe(true);
  });

  it("parses an empty object", () => {
    const result = intervalLimitsType.safeParse({});
    expect(result.success).toBe(true);
  });

  it("parses null", () => {
    const result = intervalLimitsType.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("rejects non-numeric values for limit keys", () => {
    expect(intervalLimitsType.safeParse({ PER_DAY: "five" }).success).toBe(false);
    expect(intervalLimitsType.safeParse({ PER_WEEK: true }).success).toBe(false);
  });

  it("strips unknown keys", () => {
    const result = intervalLimitsType.safeParse({ PER_DAY: 1, UNKNOWN_KEY: 99 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("UNKNOWN_KEY");
    }
  });

  it("allows zero as a valid limit value", () => {
    const result = intervalLimitsType.safeParse({ PER_DAY: 0 });
    expect(result.success).toBe(true);
  });

  it("allows negative numbers", () => {
    const result = intervalLimitsType.safeParse({ PER_DAY: -1 });
    expect(result.success).toBe(true);
  });
});
