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

  it("returns the same amount for zero-decimal currencies (JPY)", () => {
    expect(convertToSmallestCurrencyUnit(1000, "JPY")).toBe(1000);
  });

  it("handles case-insensitive currency codes", () => {
    expect(convertToSmallestCurrencyUnit(500, "jpy")).toBe(500);
  });

  it("rounds to nearest integer for standard currencies", () => {
    expect(convertToSmallestCurrencyUnit(10.99, "USD")).toBe(1099);
  });

  it("handles zero amount", () => {
    expect(convertToSmallestCurrencyUnit(0, "USD")).toBe(0);
  });

  it("handles other zero-decimal currencies (KRW)", () => {
    expect(convertToSmallestCurrencyUnit(5000, "KRW")).toBe(5000);
  });
});

describe("convertFromSmallestToPresentableCurrencyUnit", () => {
  it("divides by 100 for standard currencies (USD)", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(1000, "USD")).toBe(10);
  });

  it("returns the same amount for zero-decimal currencies (JPY)", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(1000, "JPY")).toBe(1000);
  });

  it("handles case-insensitive currency codes", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(500, "jpy")).toBe(500);
  });
});

describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns a currency symbol for EUR", () => {
    const symbol = getCurrencySymbol("EUR");
    expect(symbol).toBeTruthy();
    expect(symbol.length).toBeGreaterThan(0);
  });

  it("returns $ as fallback for invalid currency code", () => {
    expect(getCurrencySymbol("INVALID")).toBe("$");
  });
});

describe("formatPrice", () => {
  it("formats a standard currency price (USD)", () => {
    const result = formatPrice(1000, "USD");
    expect(result).toContain("10");
    expect(result).toContain("$");
  });

  it("formats BTC as sats", () => {
    expect(formatPrice(1000, "BTC")).toBe("1000 sats");
  });

  it("defaults to USD when currency is undefined", () => {
    const result = formatPrice(500, undefined);
    expect(result).toContain("$");
  });

  it("handles case-insensitive currency codes", () => {
    const result = formatPrice(1000, "usd");
    expect(result).toContain("$");
  });

  it("respects locale parameter", () => {
    const result = formatPrice(1000, "EUR", "de");
    expect(result).toBeTruthy();
  });
});
