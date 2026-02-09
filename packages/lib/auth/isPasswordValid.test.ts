import { describe, expect, it } from "vitest";
import { isPasswordValid } from "./isPasswordValid";

describe("isPasswordValid", () => {
  describe("basic ASCII passwords", () => {
    it("accepts a valid password with ASCII letters and a digit", () => {
      expect(isPasswordValid("Abcdefg1")).toBe(true);
    });

    it("rejects a password missing uppercase", () => {
      expect(isPasswordValid("abcdefg1")).toBe(false);
    });

    it("rejects a password missing lowercase", () => {
      expect(isPasswordValid("ABCDEFG1")).toBe(false);
    });

    it("rejects a password missing a digit", () => {
      expect(isPasswordValid("Abcdefgh")).toBe(false);
    });

    it("rejects a password that is too short", () => {
      expect(isPasswordValid("Abcde1")).toBe(false);
    });
  });

  describe("Unicode uppercase and lowercase recognition", () => {
    it("accepts Unicode uppercase as the capital requirement (German sharp-S uppercase)", () => {
      // U+1E9E LATIN CAPITAL LETTER SHARP S — classified as \p{Lu}
      expect(isPasswordValid("ẞbcdefg1")).toBe(true);
    });

    it("accepts Cyrillic uppercase and lowercase letters", () => {
      // А = Cyrillic capital A (\p{Lu}), б = Cyrillic small Be (\p{Ll})
      expect(isPasswordValid("Абвгдеж1")).toBe(true);
    });

    it("accepts Greek uppercase and lowercase letters", () => {
      // Ω = Greek capital Omega, α = Greek small Alpha
      expect(isPasswordValid("Ωαβγδεζ1")).toBe(true);
    });

    it("accepts accented Latin uppercase and lowercase", () => {
      // É = Latin capital E with acute, ñ = Latin small N with tilde
      expect(isPasswordValid("Éñabcde1")).toBe(true);
    });

    it("rejects password with only Unicode lowercase and digits", () => {
      // All lowercase Cyrillic — no uppercase
      expect(isPasswordValid("абвгдеж1")).toBe(false);
    });

    it("rejects password with only Unicode uppercase and digits", () => {
      // All uppercase Greek — no lowercase
      expect(isPasswordValid("ΑΒΓΔΕΖΗ1")).toBe(false);
    });
  });

  describe("breakdown mode", () => {
    it("returns breakdown object with caplow, num, min", () => {
      const result = isPasswordValid("Abcdefg1", true);
      expect(result).toEqual({ caplow: true, num: true, min: true });
    });

    it("reports caplow false when missing uppercase", () => {
      const result = isPasswordValid("abcdefg1", true);
      expect(result).toEqual({ caplow: false, num: true, min: true });
    });

    it("reports caplow true for Unicode uppercase", () => {
      const result = isPasswordValid("Ωαβγδεζ1", true);
      expect(result).toEqual({ caplow: true, num: true, min: true });
    });
  });

  describe("strict mode", () => {
    it("requires more than 14 characters in strict mode", () => {
      const result = isPasswordValid("Abcdefghijklmn1", true, true);
      expect(result).toEqual({ caplow: true, num: true, min: true, admin_min: true });
    });

    it("fails admin_min when 14 characters or fewer in strict mode", () => {
      const result = isPasswordValid("Abcdefghijk1", true, true);
      expect(result).toEqual({ caplow: true, num: true, min: false, admin_min: false });
    });
  });
});
