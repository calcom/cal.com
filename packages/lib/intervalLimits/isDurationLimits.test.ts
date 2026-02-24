import { describe, expect, it } from "vitest";
import { isDurationLimit, parseDurationLimit } from "./isDurationLimits";

describe("isDurationLimit", () => {
  it("returns true for a valid interval limit object", () => {
    expect(isDurationLimit({ PER_DAY: 60, PER_WEEK: 300 })).toBe(true);
  });

  it("returns true for an empty object", () => {
    expect(isDurationLimit({})).toBe(true);
  });

  it("returns true for null", () => {
    expect(isDurationLimit(null)).toBe(true);
  });

  it("returns false for a string", () => {
    expect(isDurationLimit("not an object")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isDurationLimit(42)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDurationLimit(undefined)).toBe(false);
  });

  it("returns false for invalid field types", () => {
    expect(isDurationLimit({ PER_DAY: "sixty" })).toBe(false);
  });
});

describe("parseDurationLimit", () => {
  it("returns the object when valid", () => {
    const input = { PER_DAY: 120, PER_YEAR: 5000 };
    expect(parseDurationLimit(input)).toEqual(input);
  });

  it("returns null when input is null", () => {
    expect(parseDurationLimit(null)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseDurationLimit("invalid")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseDurationLimit(undefined)).toBeNull();
  });

  it("returns empty object for empty object input", () => {
    expect(parseDurationLimit({})).toEqual({});
  });
});
