import { describe, expect, it } from "vitest";

import {
  convertToSmallestCurrencyUnit,
  convertFromSmallestToPresentableCurrencyUnit,
  formatPrice,
} from "./currencyConversions";

describe("currencyConversions", () => {
  describe("convertToSmallestCurrencyUnit", () => {
    it("should scale 2-decimal currencies by 100", () => {
      expect(convertToSmallestCurrencyUnit(50, "USD")).toBe(5000);
      expect(convertToSmallestCurrencyUnit(19.99, "EUR")).toBe(1999);
      expect(convertToSmallestCurrencyUnit(10.5, "GBP")).toBe(1050);
    });

    it("should preserve zero-decimal currencies without scaling", () => {
      expect(convertToSmallestCurrencyUnit(10000, "JPY")).toBe(10000);
      expect(convertToSmallestCurrencyUnit(10000, "jpy")).toBe(10000);
      expect(convertToSmallestCurrencyUnit(50000, "KRW")).toBe(50000);
      expect(convertToSmallestCurrencyUnit(100000, "VND")).toBe(100000);
      expect(convertToSmallestCurrencyUnit(500, "CLP")).toBe(500);
    });
  });

  describe("convertFromSmallestToPresentableCurrencyUnit", () => {
    it("should divide 2-decimal currencies by 100", () => {
      expect(convertFromSmallestToPresentableCurrencyUnit(5000, "USD")).toBe(50);
      expect(convertFromSmallestToPresentableCurrencyUnit(1999, "EUR")).toBe(19.99);
    });

    it("should preserve zero-decimal currencies without dividing", () => {
      expect(convertFromSmallestToPresentableCurrencyUnit(10000, "JPY")).toBe(10000);
      expect(convertFromSmallestToPresentableCurrencyUnit(10000, "jpy")).toBe(10000);
      expect(convertFromSmallestToPresentableCurrencyUnit(50000, "KRW")).toBe(50000);
      expect(convertFromSmallestToPresentableCurrencyUnit(100000, "VND")).toBe(100000);
    });
  });

  describe("formatPrice", () => {
    it("should format zero-decimal currencies correctly", () => {
      const formatted = formatPrice(10000, "JPY", "en");
      expect(formatted).toContain("10,000");
    });

    it("should format standard currencies correctly", () => {
      const formatted = formatPrice(5000, "USD", "en");
      expect(formatted).toContain("50.00");
    });
  });
});
