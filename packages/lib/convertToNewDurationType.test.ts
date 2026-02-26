import { describe, it, expect } from "vitest";

import convertToNewDurationType, { MINUTES_IN_HOUR, MINUTES_IN_DAY, HOURS_IN_DAY } from "./convertToNewDurationType";

describe("convertToNewDurationType", () => {
  describe("identity conversions", () => {
    it("should return the same value when converting minutes to minutes", () => {
      expect(convertToNewDurationType("minutes", "minutes", 120)).toBe(120);
    });

    it("should return the same value when converting hours to hours", () => {
      expect(convertToNewDurationType("hours", "hours", 5)).toBe(5);
    });

    it("should return the same value when converting days to days", () => {
      expect(convertToNewDurationType("days", "days", 3)).toBe(3);
    });
  });

  describe("minutes to other types", () => {
    it("should convert minutes to hours", () => {
      expect(convertToNewDurationType("minutes", "hours", 120)).toBe(2);
      expect(convertToNewDurationType("minutes", "hours", 60)).toBe(1);
    });

    it("should convert minutes to days", () => {
      expect(convertToNewDurationType("minutes", "days", 2880)).toBe(2);
      expect(convertToNewDurationType("minutes", "days", 1440)).toBe(1);
    });
  });

  describe("hours to other types", () => {
    it("should convert hours to minutes", () => {
      expect(convertToNewDurationType("hours", "minutes", 2)).toBe(120);
      expect(convertToNewDurationType("hours", "minutes", 1)).toBe(60);
    });

    it("should convert hours to days", () => {
      expect(convertToNewDurationType("hours", "days", 24)).toBe(1);
      expect(convertToNewDurationType("hours", "days", 48)).toBe(2);
    });
  });

  describe("days to other types", () => {
    it("should convert days to minutes", () => {
      expect(convertToNewDurationType("days", "minutes", 1)).toBe(1440);
      expect(convertToNewDurationType("days", "minutes", 2)).toBe(2880);
    });

    it("should convert days to hours", () => {
      expect(convertToNewDurationType("days", "hours", 1)).toBe(24);
      expect(convertToNewDurationType("days", "hours", 2)).toBe(48);
    });
  });

  describe("rounding", () => {
    it("should round up fractional results with Math.ceil", () => {
      // 90 minutes = 1.5 hours, should ceil to 2
      expect(convertToNewDurationType("minutes", "hours", 90)).toBe(2);
      // 100 minutes = 0.069 days, should ceil to 1
      expect(convertToNewDurationType("minutes", "days", 100)).toBe(1);
      // 5 hours = 0.208 days, should ceil to 1
      expect(convertToNewDurationType("hours", "days", 5)).toBe(1);
    });
  });

  describe("zero values", () => {
    it("should handle zero correctly for all conversions", () => {
      expect(convertToNewDurationType("minutes", "hours", 0)).toBe(0);
      expect(convertToNewDurationType("minutes", "days", 0)).toBe(0);
      expect(convertToNewDurationType("hours", "minutes", 0)).toBe(0);
      expect(convertToNewDurationType("hours", "days", 0)).toBe(0);
      expect(convertToNewDurationType("days", "minutes", 0)).toBe(0);
      expect(convertToNewDurationType("days", "hours", 0)).toBe(0);
    });
  });

  describe("exported constants", () => {
    it("should export correct constant values", () => {
      expect(MINUTES_IN_HOUR).toBe(60);
      expect(MINUTES_IN_DAY).toBe(1440);
      expect(HOURS_IN_DAY).toBe(24);
    });
  });
});
