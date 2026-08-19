import { describe, expect, it } from "vitest";
import { convertFromSmallestToPresentableCurrencyUnit } from "@calcom/lib/currencyConversions";

describe("PayPal currency conversion for zero-decimal and standard currencies", () => {
  it("converts standard minor unit currencies (USD, EUR) by dividing by 100", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(5000, "USD").toString()).toBe("50");
    expect(convertFromSmallestToPresentableCurrencyUnit(1000, "EUR").toString()).toBe("10");
  });

  it("preserves unscaled amounts for zero-decimal currencies (JPY, KRW, VND)", () => {
    expect(convertFromSmallestToPresentableCurrencyUnit(10000, "JPY").toString()).toBe("10000");
    expect(convertFromSmallestToPresentableCurrencyUnit(1050, "JPY").toString()).toBe("1050");
    expect(convertFromSmallestToPresentableCurrencyUnit(50000, "KRW").toString()).toBe("50000");
  });
});
