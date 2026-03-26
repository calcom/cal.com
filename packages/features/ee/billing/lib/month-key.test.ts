import { describe, expect, it } from "vitest";
import { formatMonthKey, isValidMonthKey } from "./month-key";

describe("formatMonthKey", () => {
  it("formats a date in January correctly", () => {
    const date = new Date(Date.UTC(2024, 0, 15));
    expect(formatMonthKey(date)).toBe("2024-01");
  });

  it("formats a date in December correctly", () => {
    const date = new Date(Date.UTC(2024, 11, 31));
    expect(formatMonthKey(date)).toBe("2024-12");
  });

  it("pads single-digit months with leading zero", () => {
    const date = new Date(Date.UTC(2024, 2, 1));
    expect(formatMonthKey(date)).toBe("2024-03");
  });

  it("handles year boundaries", () => {
    const date = new Date(Date.UTC(2025, 0, 1));
    expect(formatMonthKey(date)).toBe("2025-01");
  });

  it("uses UTC month to avoid timezone issues", () => {
    // Create a date at the very end of a month in UTC
    const date = new Date(Date.UTC(2024, 5, 30, 23, 59, 59));
    expect(formatMonthKey(date)).toBe("2024-06");
  });
});

describe("isValidMonthKey", () => {
  it("returns true for valid month keys", () => {
    expect(isValidMonthKey("2024-01")).toBe(true);
    expect(isValidMonthKey("2024-06")).toBe(true);
    expect(isValidMonthKey("2024-12")).toBe(true);
    expect(isValidMonthKey("2000-09")).toBe(true);
  });

  it("returns false for month 00", () => {
    expect(isValidMonthKey("2024-00")).toBe(false);
  });

  it("returns false for month 13 and above", () => {
    expect(isValidMonthKey("2024-13")).toBe(false);
    expect(isValidMonthKey("2024-99")).toBe(false);
  });

  it("returns false for invalid formats", () => {
    expect(isValidMonthKey("2024")).toBe(false);
    expect(isValidMonthKey("2024-1")).toBe(false);
    expect(isValidMonthKey("24-01")).toBe(false);
    expect(isValidMonthKey("")).toBe(false);
    expect(isValidMonthKey("abcd-01")).toBe(false);
    expect(isValidMonthKey("2024/01")).toBe(false);
  });

  it("returns false for keys with extra characters", () => {
    expect(isValidMonthKey("2024-01-01")).toBe(false);
    expect(isValidMonthKey(" 2024-01")).toBe(false);
    expect(isValidMonthKey("2024-01 ")).toBe(false);
  });
});
