import { describe, expect, it } from "vitest";

import { formatMonthKey, isValidMonthKey } from "./month-key";

describe("month-key utils", () => {
  describe("formatMonthKey", () => {
    it("should format date to YYYY-MM using UTC", () => {
      const date = new Date("2023-12-15T14:30:00Z");
      const result = formatMonthKey(date);
      expect(result).toBe("2023-12");
    });

    it("should pad single digit months with zero", () => {
      const date = new Date("2023-05-15T14:30:00Z");
      const result = formatMonthKey(date);
      expect(result).toBe("2023-05");
    });

    it("should handle January correctly", () => {
      const date = new Date("2023-01-15T14:30:00Z");
      const result = formatMonthKey(date);
      expect(result).toBe("2023-01");
    });

    it("should handle December correctly", () => {
      const date = new Date("2023-12-31T23:59:59Z");
      const result = formatMonthKey(date);
      expect(result).toBe("2023-12");
    });

    it("should use UTC time regardless of local timezone", () => {
      // Create a date that would be different month in different timezones
      const date = new Date("2023-01-01T02:00:00Z");
      const result = formatMonthKey(date);
      expect(result).toBe("2023-01");
    });

    it("should handle year changes correctly", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const result = formatMonthKey(date);
      expect(result).toBe("2024-01");
    });
  });

  describe("isValidMonthKey", () => {
    describe("valid month keys", () => {
      it("should accept valid month key format", () => {
        expect(isValidMonthKey("2023-12")).toBe(true);
      });

      it("should accept January", () => {
        expect(isValidMonthKey("2023-01")).toBe(true);
      });

      it("should accept December", () => {
        expect(isValidMonthKey("2023-12")).toBe(true);
      });

      it("should accept 4-digit years", () => {
        expect(isValidMonthKey("2024-06")).toBe(true);
      });

      it("should accept older years", () => {
        expect(isValidMonthKey("1999-03")).toBe(true);
      });

      it("should accept future years", () => {
        expect(isValidMonthKey("2099-08")).toBe(true);
      });
    });

    describe("invalid month keys", () => {
      it("should reject month 00", () => {
        expect(isValidMonthKey("2023-00")).toBe(false);
      });

      it("should reject month 13", () => {
        expect(isValidMonthKey("2023-13")).toBe(false);
      });

      it("should reject month without leading zero", () => {
        expect(isValidMonthKey("2023-5")).toBe(false);
      });

      it("should reject 2-digit years", () => {
        expect(isValidMonthKey("23-12")).toBe(false);
      });

      it("should reject 3-digit years", () => {
        expect(isValidMonthKey("202-12")).toBe(false);
      });

      it("should reject 5-digit years", () => {
        expect(isValidMonthKey("20233-12")).toBe(false);
      });

      it("should reject missing dash", () => {
        expect(isValidMonthKey("202312")).toBe(false);
      });

      it("should reject extra characters", () => {
        expect(isValidMonthKey("2023-12-01")).toBe(false);
      });

      it("should reject non-numeric year", () => {
        expect(isValidMonthKey("abcd-12")).toBe(false);
      });

      it("should reject non-numeric month", () => {
        expect(isValidMonthKey("2023-ab")).toBe(false);
      });

      it("should reject empty string", () => {
        expect(isValidMonthKey("")).toBe(false);
      });

      it("should reject whitespace", () => {
        expect(isValidMonthKey("2023-12 ")).toBe(false);
      });

      it("should reject multiple dashes", () => {
        expect(isValidMonthKey("2023--12")).toBe(false);
      });
    });
  });
});
