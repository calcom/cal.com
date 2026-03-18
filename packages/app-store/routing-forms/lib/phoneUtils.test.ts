import { describe, expect, it } from "vitest";

import { applyDefaultCountryCodeToPhoneValue, normalizeCountryCode } from "./phoneUtils";

describe("phoneUtils", () => {
  describe("normalizeCountryCode", () => {
    it("normalizes country code with plus prefix", () => {
      expect(normalizeCountryCode("91")).toBe("+91");
      expect(normalizeCountryCode("+1")).toBe("+1");
      expect(normalizeCountryCode("  +44 ")).toBe("+44");
    });

    it("returns null for invalid country code", () => {
      expect(normalizeCountryCode("abc")).toBeNull();
      expect(normalizeCountryCode("+1-2")).toBeNull();
      expect(normalizeCountryCode("")).toBeNull();
      expect(normalizeCountryCode(undefined)).toBeNull();
    });
  });

  describe("applyDefaultCountryCodeToPhoneValue", () => {
    it("prepends configured default country code when value doesn't include one", () => {
      expect(
        applyDefaultCountryCodeToPhoneValue({
          value: "9876543210",
          defaultCountryCode: "+91",
        })
      ).toBe("+919876543210");
    });

    it("keeps value unchanged when it already has country code", () => {
      expect(
        applyDefaultCountryCodeToPhoneValue({
          value: "+14155552671",
          defaultCountryCode: "+91",
        })
      ).toBe("+14155552671");
    });

    it("keeps value unchanged when default country code is missing or invalid", () => {
      expect(
        applyDefaultCountryCodeToPhoneValue({
          value: "4155552671",
        })
      ).toBe("4155552671");

      expect(
        applyDefaultCountryCodeToPhoneValue({
          value: "4155552671",
          defaultCountryCode: "invalid",
        })
      ).toBe("4155552671");
    });
  });
});
