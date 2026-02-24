import { describe, expect, it } from "vitest";
import { isEqual } from "./isEqual";

describe("isEqual", () => {
  describe("primitives", () => {
    it("returns true for identical numbers", () => {
      expect(isEqual(1, 1)).toBe(true);
    });

    it("returns false for different numbers", () => {
      expect(isEqual(1, 2)).toBe(false);
    });

    it("returns true for identical strings", () => {
      expect(isEqual("hello", "hello")).toBe(true);
    });

    it("returns false for different strings", () => {
      expect(isEqual("hello", "world")).toBe(false);
    });

    it("returns true for identical booleans", () => {
      expect(isEqual(true, true)).toBe(true);
    });

    it("returns false for different booleans", () => {
      expect(isEqual(true, false)).toBe(false);
    });

    it("returns false for different types", () => {
      expect(isEqual(1, "1")).toBe(false);
      expect(isEqual(0, false)).toBe(false);
    });
  });

  describe("null and undefined", () => {
    it("returns true for null === null", () => {
      expect(isEqual(null, null)).toBe(true);
    });

    it("returns true for undefined === undefined", () => {
      expect(isEqual(undefined, undefined)).toBe(true);
    });

    it("returns false for null vs undefined", () => {
      expect(isEqual(null, undefined)).toBe(false);
    });

    it("returns false for null vs object", () => {
      expect(isEqual(null, {})).toBe(false);
    });

    it("returns false for undefined vs object", () => {
      expect(isEqual(undefined, {})).toBe(false);
    });
  });

  describe("arrays", () => {
    it("returns true for identical arrays", () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it("returns false for arrays with different lengths", () => {
      expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("returns false for arrays with different values", () => {
      expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("returns true for empty arrays", () => {
      expect(isEqual([], [])).toBe(true);
    });

    it("returns true for nested arrays", () => {
      expect(isEqual([[1, 2], [3]], [[1, 2], [3]])).toBe(true);
    });

    it("returns false for nested arrays with differences", () => {
      expect(isEqual([[1, 2], [3]], [[1, 2], [4]])).toBe(false);
    });
  });

  describe("objects", () => {
    it("returns true for identical objects", () => {
      expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it("returns false for objects with different keys", () => {
      expect(isEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it("returns false for objects with different values", () => {
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("returns false for objects with different number of keys", () => {
      expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("returns true for empty objects", () => {
      expect(isEqual({}, {})).toBe(true);
    });

    it("returns true for deeply nested objects", () => {
      expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
    });

    it("returns false for deeply nested objects with differences", () => {
      expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    });

    it("returns false when other object is missing a key from value object", () => {
      const value = { a: 1, b: 2 };
      const other = { a: 1, c: 2 };
      expect(isEqual(value, other)).toBe(false);
    });
  });

  describe("mixed types", () => {
    it("treats array and object with same indexed keys as equal", () => {
      // Arrays are objects; when one side is not an array, the object comparison matches on keys "0", "1"
      expect(isEqual([1, 2], { 0: 1, 1: 2 })).toBe(true);
    });

    it("returns true for same reference", () => {
      const ref = { a: 1 };
      expect(isEqual(ref, ref)).toBe(true);
    });

    it("handles objects with array values", () => {
      expect(isEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
      expect(isEqual({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
    });
  });
});
