import { describe, expect, it } from "vitest";
import {
  DEFAULT_RATING,
  getRatingEmoji,
  MAX_RATING,
  MIN_RATING,
  RATING_OPTIONS,
  validateRating,
} from "./rating";

describe("validateRating", () => {
  it("returns the parsed number for a valid numeric rating", () => {
    expect(validateRating(4)).toBe(4);
  });

  it("parses a string rating to a number", () => {
    expect(validateRating("3")).toBe(3);
  });

  it("clamps ratings above MAX_RATING", () => {
    expect(validateRating(10)).toBe(MAX_RATING);
    expect(validateRating("99")).toBe(MAX_RATING);
  });

  it("clamps ratings below MIN_RATING", () => {
    expect(validateRating(0)).toBe(DEFAULT_RATING);
    expect(validateRating(-5)).toBe(MIN_RATING);
  });

  it("returns default for null", () => {
    expect(validateRating(null)).toBe(DEFAULT_RATING);
  });

  it("returns default for undefined", () => {
    expect(validateRating(undefined)).toBe(DEFAULT_RATING);
  });

  it("returns default for NaN string", () => {
    expect(validateRating("not-a-number")).toBe(DEFAULT_RATING);
  });

  it("uses custom default value when provided", () => {
    expect(validateRating(null, 1)).toBe(1);
  });

  it("returns exact boundary values", () => {
    expect(validateRating(MIN_RATING)).toBe(MIN_RATING);
    expect(validateRating(MAX_RATING)).toBe(MAX_RATING);
  });
});

describe("getRatingEmoji", () => {
  it("returns the correct emoji for each rating value", () => {
    expect(getRatingEmoji(1)).toBe("😠");
    expect(getRatingEmoji(2)).toBe("🙁");
    expect(getRatingEmoji(3)).toBe("😐");
    expect(getRatingEmoji(4)).toBe("😄");
    expect(getRatingEmoji(5)).toBe("😍");
  });

  it("returns empty string for out-of-range values", () => {
    expect(getRatingEmoji(0)).toBe("");
    expect(getRatingEmoji(6)).toBe("");
    expect(getRatingEmoji(-1)).toBe("");
  });
});

describe("RATING_OPTIONS", () => {
  it("has exactly 5 options", () => {
    expect(RATING_OPTIONS).toHaveLength(5);
  });

  it("has sequential values from 1 to 5", () => {
    const values = RATING_OPTIONS.map((opt) => opt.value);
    expect(values).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("constants", () => {
  it("has correct boundary values", () => {
    expect(MIN_RATING).toBe(1);
    expect(MAX_RATING).toBe(5);
    expect(DEFAULT_RATING).toBe(3);
  });
});
