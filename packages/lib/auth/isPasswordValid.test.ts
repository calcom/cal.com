import { describe, expect, it } from "vitest";
import { isPasswordValid } from "./isPasswordValid";

describe("isPasswordValid", () => {
  describe("boolean mode (no breakdown)", () => {
    it("returns true for a valid password", () => {
      expect(isPasswordValid("Abcdefg1")).toBe(true);
    });

    it("returns false when missing uppercase", () => {
      expect(isPasswordValid("abcdefg1")).toBe(false);
    });

    it("returns false when missing lowercase", () => {
      expect(isPasswordValid("ABCDEFG1")).toBe(false);
    });

    it("returns false when missing number", () => {
      expect(isPasswordValid("Abcdefgh")).toBe(false);
    });

    it("returns false when too short", () => {
      expect(isPasswordValid("Abc1ef")).toBe(false);
    });

    it("returns true for exactly 7 characters with all requirements", () => {
      expect(isPasswordValid("Abcdef1")).toBe(true);
    });
  });

  describe("breakdown mode", () => {
    it("returns an object with all true for valid password", () => {
      const result = isPasswordValid("Abcdefg1", true);
      expect(result).toEqual({ caplow: true, num: true, min: true });
    });

    it("returns caplow false when missing uppercase", () => {
      const result = isPasswordValid("abcdefg1", true);
      expect(result).toEqual({ caplow: false, num: true, min: true });
    });

    it("returns caplow false when missing lowercase", () => {
      const result = isPasswordValid("ABCDEFG1", true);
      expect(result).toEqual({ caplow: false, num: true, min: true });
    });

    it("returns num false when missing number", () => {
      const result = isPasswordValid("Abcdefgh", true);
      expect(result).toEqual({ caplow: true, num: false, min: true });
    });

    it("returns min false when too short", () => {
      const result = isPasswordValid("Abc1", true);
      expect(result).toEqual({ caplow: true, num: true, min: false });
    });
  });

  describe("strict mode", () => {
    it("returns true for valid password over 14 characters in strict mode", () => {
      expect(isPasswordValid("Abcdefghijklmn1", false, true)).toBe(true);
    });

    it("returns false for password under 15 characters in strict mode", () => {
      // 7 chars with all requirements but too short for strict
      expect(isPasswordValid("Abcdef1", false, true)).toBe(false);
    });

    it("includes admin_min in breakdown when strict is true", () => {
      const result = isPasswordValid("Abcdefghijklmn1", true, true);
      expect(result).toEqual({ caplow: true, num: true, min: true, admin_min: true });
    });

    it("returns admin_min and min false when strict password is under 15 chars", () => {
      // In strict mode, min requires length > 14, so 8-char password fails both min and admin_min
      const result = isPasswordValid("Abcdefg1", true, true);
      expect(result).toEqual({ caplow: true, num: true, min: false, admin_min: false });
    });
  });
});
