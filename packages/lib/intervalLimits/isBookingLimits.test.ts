import { describe, expect, it } from "vitest";
import { isBookingLimit, parseBookingLimit } from "./isBookingLimits";

describe("isBookingLimit", () => {
  it("returns true for a valid interval limit object", () => {
    expect(isBookingLimit({ PER_DAY: 5, PER_WEEK: 10 })).toBe(true);
  });

  it("returns true for an empty object", () => {
    expect(isBookingLimit({})).toBe(true);
  });

  it("returns true for null", () => {
    expect(isBookingLimit(null)).toBe(true);
  });

  it("returns false for a string", () => {
    expect(isBookingLimit("not an object")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isBookingLimit(42)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isBookingLimit(undefined)).toBe(false);
  });

  it("returns false for invalid field types", () => {
    expect(isBookingLimit({ PER_DAY: "five" })).toBe(false);
  });
});

describe("parseBookingLimit", () => {
  it("returns the object when valid", () => {
    const input = { PER_DAY: 3, PER_MONTH: 30 };
    expect(parseBookingLimit(input)).toEqual(input);
  });

  it("returns null when valid", () => {
    expect(parseBookingLimit(null)).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseBookingLimit("invalid")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseBookingLimit(undefined)).toBeNull();
  });

  it("returns empty object for empty object input", () => {
    expect(parseBookingLimit({})).toEqual({});
  });
});
