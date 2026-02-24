import { describe, expect, it } from "vitest";
import notEmpty from "./notEmpty";

describe("notEmpty", () => {
  it("returns true for a non-empty string", () => {
    expect(notEmpty("hello")).toBe(true);
  });

  it("returns true for a number", () => {
    expect(notEmpty(42)).toBe(true);
  });

  it("returns true for an object", () => {
    expect(notEmpty({ a: 1 })).toBe(true);
  });

  it("returns true for true", () => {
    expect(notEmpty(true)).toBe(true);
  });

  it("returns false for null", () => {
    expect(notEmpty(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(notEmpty(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(notEmpty("")).toBe(false);
  });

  it("returns false for 0", () => {
    expect(notEmpty(0)).toBe(false);
  });

  it("can be used as array filter predicate", () => {
    const arr = [1, null, 2, undefined, 3];
    const filtered = arr.filter(notEmpty);
    expect(filtered).toEqual([1, 2, 3]);
  });
});
