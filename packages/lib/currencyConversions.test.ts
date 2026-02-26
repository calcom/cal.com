import { describe, expect, it } from "vitest";

import {
  convertFromSmallestToPresentableCurrencyUnit,
  convertToSmallestCurrencyUnit,
  formatPrice,
  getCurrencySymbol,
} from "./currencyConversions";

describe("convertToSmallestCurrencyUnit", () => {
  it("multiplies by 100 for standard currencies (USD)", () => {
    expect(convertToSmallestCurrencyUnit(10, "USD")).toBe(1000);
  });

  it("multiplies by 100 for EUR", () => {
    expect(convertToSmallestCurrencyUnit(25.5, "EUR")).toBe(2550);
  });

  it("rounds to avoid floating-point issues", () => {
    // 19.99 * 100 = 1998.9999... without rounding
    expect(convertToSmallestCurrencyUnit(19.99, "USD")).toBe(1999);
  });

  it("rounds to nearest integer for standard currencies", () => {
    expect(convertToSmallestCurrencyUnit(10.99, "USD")).toBe(1099);
  });

  it("returns amount as-is for zero-decimal currencies (JPY)", () => {
    expect(convertToSmallestCurrencyUnit(1000, "JPY")).toBe(1000);
  });

  it("returns amount as-is for KRW", () => {
    expect(convertToSmallestCurrencyUnit(5000, "KRW")).toBe(5000);
  });

  it("handles case-insensitive currency codes", () => {
    expect(convertToSmallestCurrencyUnit(1000, "jpy")).toBe(1000);
    expect(convertToSmallestCurrencyUnit(10, "usd")).toBe(1000);
  });

  it("handles zero amount", () => {
    expect(convertToSmallestCurrencyUnit(0, "USD")).toBe(0);
    expect(convertToSmallestCurrencyUnit(0, "JPY")).toBe(0);
  });
});

describe("convertFromSmallestToPresentableCurrencyUnit", () => {
  it("divides by 100 for standard currencies", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(1000, "USD")).toBe(10);
  });

  it("returns amount as-is for zero-decimal currencies", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(1000, "JPY")).toBe(1000);
  });

  it("preserves decimal precision", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(1999, "USD")).toBe(19.99);
  });

  it("handles case-insensitive currency codes", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(1000, "jpy")).toBe(1000);
  });
});

describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns correct symbol for EUR", () => {
    const symbol = getCurrencySymbol("EUR");
    expect(symbol).toBe("€");
  });

  it("returns correct symbol for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns correct symbol for JPY", () => {
    const symbol = getCurrencySymbol("JPY");
    expect(symbol).toBe("¥");
  });

  it("falls back to $ for invalid currency code", () => {
    const symbol = getCurrencySymbol("INVALID");
    expect(symbol).toBe("$");
  });
});

describe("formatPrice", () => {
  it("formats BTC as sats", () => {
    expect(formatPrice(21000, "BTC")).toBe("21000 sats");
  });

  it("formats USD from smallest unit", () => {
    const result = formatPrice(1000, "USD");
    // 1000 cents = $10.00
    expect(result).toContain("10");
    expect(result).toContain("$");
  });

  it("defaults to USD when currency is undefined", () => {
    const result = formatPrice(500, undefined);
    // 500 cents = $5.00
    expect(result).toContain("5");
    expect(result).toContain("$");
  });

  it("handles zero-decimal currencies in formatting", () => {
    const result = formatPrice(1000, "JPY");
    // JPY 1000 should show ¥1,000
    expect(result).toContain("1,000");
  });

  it("handles case-insensitive currency", () => {
    const result = formatPrice(1000, "usd");
    expect(result).toContain("$");
  });

  it("accepts locale parameter", () => {
    const result = formatPrice(1000, "EUR", "de-DE");
    // German locale formats EUR differently
    expect(result).toBeDefined();
  });
});
