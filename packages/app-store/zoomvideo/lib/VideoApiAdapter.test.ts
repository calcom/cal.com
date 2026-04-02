import { describe, expect, test } from "vitest";
import { hasInvalidConsecutiveChars } from "./VideoApiAdapter";

describe("hasInvalidConsecutiveChars", () => {
  const minConsecutiveLength = 4;

  test("returns false when consecutiveLength is undefined or < 4", () => {
    expect(hasInvalidConsecutiveChars("1234", undefined)).toBe(false);
    expect(hasInvalidConsecutiveChars("1234", 3)).toBe(false);
  });

  test("detects ascending numeric sequences", () => {
    expect(hasInvalidConsecutiveChars("1234", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("xx1234yy", minConsecutiveLength)).toBe(true);
  });

  test("detects ascending alphabetic sequences", () => {
    expect(hasInvalidConsecutiveChars("abcd", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("xxabcdyy", minConsecutiveLength)).toBe(true);
  });

  test("detects descending sequences", () => {
    expect(hasInvalidConsecutiveChars("4321", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("xxfedcyy", minConsecutiveLength)).toBe(true);
  });

  test("detects repetitive characters", () => {
    expect(hasInvalidConsecutiveChars("1111", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("aaaa", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("xx1111yy", minConsecutiveLength)).toBe(true);
  });

  test("detects keyboard sequences from QWERTY rows", () => {
    expect(hasInvalidConsecutiveChars("qwert", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("poiuy", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("asdf", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("lkjh", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("zxcv", minConsecutiveLength)).toBe(true);
    expect(hasInvalidConsecutiveChars("vcxz", minConsecutiveLength)).toBe(true);
  });

  test("returns false for passwords without invalid consecutive patterns", () => {
    expect(hasInvalidConsecutiveChars("1a2b3c4d", minConsecutiveLength)).toBe(false);
    expect(hasInvalidConsecutiveChars("a1b2c3d4", minConsecutiveLength)).toBe(false);
    expect(hasInvalidConsecutiveChars("pass-9wX!", minConsecutiveLength)).toBe(false);
  });
});
