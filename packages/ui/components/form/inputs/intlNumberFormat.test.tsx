import { describe, it, expect } from "vitest";

import { formatNumberByLocale } from "./TextField";
import { getRawValue } from "./TextField";

describe("formatNumberByLocale", () => {
  it("should format numbers correctly for en-US locale", () => {
    expect(formatNumberByLocale("1234567", "en")).toBe("1,234,567");
    expect(formatNumberByLocale("1000", "en")).toBe("1,000");
    expect(formatNumberByLocale("100", "en")).toBe("100");
  });

  it("should format numbers correctly for de locale", () => {
    expect(formatNumberByLocale("1234567", "de")).toBe("1.234.567");
    expect(formatNumberByLocale("1000", "de")).toBe("1.000");
    expect(formatNumberByLocale("100", "de")).toBe("100");
  });

  it("should handle empty input", () => {
    expect(formatNumberByLocale("", "en")).toBe("");
    expect(formatNumberByLocale("", "de")).toBe("");
  });

  it("should handle non-numeric input", () => {
    expect(formatNumberByLocale("abc", "en")).toBe("abc");
    expect(formatNumberByLocale("abc123", "en")).toBe("123");
    expect(formatNumberByLocale("!@#", "en")).toBe("!@#");
  });

  it("should handle numbers with decimals", () => {
    expect(formatNumberByLocale("1234.56", "en")).toBe("1,235");
    expect(formatNumberByLocale("1234.56", "de")).toBe("1.235");
  });

  it("should handle already formatted numbers", () => {
    expect(formatNumberByLocale("1,234,567", "en")).toBe("1,234,567");
    expect(formatNumberByLocale("1.234.567", "de")).toBe("1.234.567");
  });
});

describe("getRawValue", () => {
  test("removes non-numeric characters except dots", () => {
    expect(getRawValue("$1,234.56")).toBe("1234.56");
    expect(getRawValue("€9.99")).toBe("9.99");
    expect(getRawValue("12,345.67 kg")).toBe("12345.67");
  });

  test("handles empty strings", () => {
    expect(getRawValue("")).toBe("");
  });

  test("removes letters and special characters", () => {
    expect(getRawValue("abc123")).toBe("123");
    expect(getRawValue("!@#456$%^")).toBe("456");
  });

  test("retains numbers and dots", () => {
    expect(getRawValue("0.99")).toBe("0.99");
    expect(getRawValue("1000.00")).toBe("1000.00");
  });

  test("removes spaces", () => {
    expect(getRawValue(" 123 456 ")).toBe("123456");
  });

  test("handles multiple dots correctly", () => {
    expect(getRawValue("12.34.56")).toBe("12.34.56");
  });
});
