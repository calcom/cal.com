import { describe, expect, it } from "vitest";
import { ascendingLimitKeys, descendingLimitKeys, intervalLimitKeyToUnit } from "./intervalLimit";

describe("ascendingLimitKeys", () => {
  it("lists keys in ascending order", () => {
    expect(ascendingLimitKeys).toEqual(["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"]);
  });
});

describe("descendingLimitKeys", () => {
  it("lists keys in descending order", () => {
    expect(descendingLimitKeys).toEqual(["PER_YEAR", "PER_MONTH", "PER_WEEK", "PER_DAY"]);
  });
});

describe("intervalLimitKeyToUnit", () => {
  it("converts PER_DAY to day", () => {
    expect(intervalLimitKeyToUnit("PER_DAY")).toBe("day");
  });

  it("converts PER_WEEK to week", () => {
    expect(intervalLimitKeyToUnit("PER_WEEK")).toBe("week");
  });

  it("converts PER_MONTH to month", () => {
    expect(intervalLimitKeyToUnit("PER_MONTH")).toBe("month");
  });

  it("converts PER_YEAR to year", () => {
    expect(intervalLimitKeyToUnit("PER_YEAR")).toBe("year");
  });
});
