import { describe, it, expect } from "vitest";
import convertToNewDurationType from "../convertToNewDurationType";

describe("convertToNewDurationType", () => {
  describe("Minutes conversions", () => {
    it("converts minutes to minutes", () => {
      expect(convertToNewDurationType("minutes", "minutes", 30)).toBe(30);
      expect(convertToNewDurationType("minutes", "minutes", 0)).toBe(0);
      expect(convertToNewDurationType("minutes", "minutes", 1440)).toBe(1440);
    });

    it("converts minutes to hours", () => {
      expect(convertToNewDurationType("minutes", "hours", 60)).toBe(1);
      expect(convertToNewDurationType("minutes", "hours", 120)).toBe(2);
      expect(convertToNewDurationType("minutes", "hours", 90)).toBe(1.5);
      expect(convertToNewDurationType("minutes", "hours", 30)).toBe(0.5);
      expect(convertToNewDurationType("minutes", "hours", 0)).toBe(0);
    });

    it("converts minutes to days", () => {
      expect(convertToNewDurationType("minutes", "days", 1440)).toBe(1);
      expect(convertToNewDurationType("minutes", "days", 2880)).toBe(2);
      expect(convertToNewDurationType("minutes", "days", 720)).toBe(0.5);
      expect(convertToNewDurationType("minutes", "days", 0)).toBe(0);
    });
  });

  describe("Hours conversions", () => {
    it("converts hours to minutes", () => {
      expect(convertToNewDurationType("hours", "minutes", 1)).toBe(60);
      expect(convertToNewDurationType("hours", "minutes", 2)).toBe(120);
      expect(convertToNewDurationType("hours", "minutes", 0.5)).toBe(30);
      expect(convertToNewDurationType("hours", "minutes", 1.5)).toBe(90);
      expect(convertToNewDurationType("hours", "minutes", 0)).toBe(0);
    });

    it("converts hours to hours", () => {
      expect(convertToNewDurationType("hours", "hours", 1)).toBe(1);
      expect(convertToNewDurationType("hours", "hours", 24)).toBe(24);
      expect(convertToNewDurationType("hours", "hours", 0.5)).toBe(0.5);
      expect(convertToNewDurationType("hours", "hours", 0)).toBe(0);
    });

    it("converts hours to days", () => {
      expect(convertToNewDurationType("hours", "days", 24)).toBe(1);
      expect(convertToNewDurationType("hours", "days", 48)).toBe(2);
      expect(convertToNewDurationType("hours", "days", 12)).toBe(0.5);
      expect(convertToNewDurationType("hours", "days", 36)).toBe(1.5);
      expect(convertToNewDurationType("hours", "days", 0)).toBe(0);
    });
  });

  describe("Days conversions", () => {
    it("converts days to minutes", () => {
      expect(convertToNewDurationType("days", "minutes", 1)).toBe(1440);
      expect(convertToNewDurationType("days", "minutes", 2)).toBe(2880);
      expect(convertToNewDurationType("days", "minutes", 0.5)).toBe(720);
      expect(convertToNewDurationType("days", "minutes", 0)).toBe(0);
    });

    it("converts days to hours", () => {
      expect(convertToNewDurationType("days", "hours", 1)).toBe(24);
      expect(convertToNewDurationType("days", "hours", 2)).toBe(48);
      expect(convertToNewDurationType("days", "hours", 0.5)).toBe(12);
      expect(convertToNewDurationType("days", "hours", 1.5)).toBe(36);
      expect(convertToNewDurationType("days", "hours", 0)).toBe(0);
    });

    it("converts days to days", () => {
      expect(convertToNewDurationType("days", "days", 1)).toBe(1);
      expect(convertToNewDurationType("days", "days", 7)).toBe(7);
      expect(convertToNewDurationType("days", "days", 0.5)).toBe(0.5);
      expect(convertToNewDurationType("days", "days", 0)).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("handles very large values", () => {
      expect(convertToNewDurationType("minutes", "days", 144000)).toBe(100);
      expect(convertToNewDurationType("hours", "days", 2400)).toBe(100);
      expect(convertToNewDurationType("days", "minutes", 100)).toBe(144000);
    });

    it("handles fractional values correctly", () => {
      expect(convertToNewDurationType("minutes", "hours", 45)).toBe(0.75);
      expect(convertToNewDurationType("hours", "days", 18)).toBe(0.75);
      expect(convertToNewDurationType("minutes", "days", 1080)).toBe(0.75);
    });

    it("handles negative values", () => {
      expect(convertToNewDurationType("minutes", "hours", -60)).toBe(-1);
      expect(convertToNewDurationType("hours", "minutes", -2)).toBe(-120);
      expect(convertToNewDurationType("days", "hours", -1)).toBe(-24);
    });

    it("maintains precision for decimal inputs", () => {
      expect(convertToNewDurationType("hours", "minutes", 1.25)).toBe(75);
      expect(convertToNewDurationType("hours", "minutes", 2.75)).toBe(165);
      expect(convertToNewDurationType("days", "hours", 1.25)).toBe(30);
    });

    it("rounds appropriately for display purposes", () => {
      // When converting to smaller units, should maintain precision
      expect(convertToNewDurationType("hours", "minutes", 1.1)).toBeCloseTo(66, 0);
      expect(convertToNewDurationType("days", "minutes", 0.1)).toBeCloseTo(144, 0);
      
      // When converting to larger units, should maintain decimal precision
      expect(convertToNewDurationType("minutes", "hours", 66)).toBeCloseTo(1.1, 1);
      expect(convertToNewDurationType("minutes", "days", 144)).toBeCloseTo(0.1, 1);
    });
  });

  describe("Invalid inputs", () => {
    it("handles invalid duration types gracefully", () => {
      // @ts-expect-error Testing invalid input
      expect(convertToNewDurationType("invalid", "minutes", 1)).toBe(1);
      // @ts-expect-error Testing invalid input
      expect(convertToNewDurationType("minutes", "invalid", 60)).toBe(60);
      // @ts-expect-error Testing invalid input
      expect(convertToNewDurationType("invalid", "invalid", 100)).toBe(100);
    });

    it("handles null and undefined values", () => {
      // @ts-expect-error Testing invalid input
      expect(convertToNewDurationType("minutes", "hours", null)).toBe(0);
      // @ts-expect-error Testing invalid input
      expect(convertToNewDurationType("minutes", "hours", undefined)).toBe(0);
    });

    it("handles NaN values", () => {
      expect(convertToNewDurationType("minutes", "hours", NaN)).toBe(0);
      // @ts-expect-error Testing invalid input
      expect(convertToNewDurationType("minutes", "hours", "not a number")).toBe(0);
    });

    it("handles Infinity values", () => {
      expect(convertToNewDurationType("minutes", "hours", Infinity)).toBe(Infinity);
      expect(convertToNewDurationType("minutes", "hours", -Infinity)).toBe(-Infinity);
    });
  });

  describe("Bidirectional conversions", () => {
    it("maintains value integrity when converting back and forth", () => {
      const originalMinutes = 90;
      
      // Minutes -> Hours -> Minutes
      const toHours = convertToNewDurationType("minutes", "hours", originalMinutes);
      const backToMinutes = convertToNewDurationType("hours", "minutes", toHours);
      expect(backToMinutes).toBe(originalMinutes);

      // Minutes -> Days -> Minutes
      const toDays = convertToNewDurationType("minutes", "days", 2880);
      const backToMinutes2 = convertToNewDurationType("days", "minutes", toDays);
      expect(backToMinutes2).toBe(2880);

      // Hours -> Days -> Hours
      const originalHours = 36;
      const toDays2 = convertToNewDurationType("hours", "days", originalHours);
      const backToHours = convertToNewDurationType("days", "hours", toDays2);
      expect(backToHours).toBe(originalHours);
    });
  });

  describe("Common use cases", () => {
    it("converts typical booking notice values", () => {
      // 15 minutes notice
      expect(convertToNewDurationType("minutes", "minutes", 15)).toBe(15);
      
      // 2 hours notice
      expect(convertToNewDurationType("hours", "minutes", 2)).toBe(120);
      
      // 1 day notice
      expect(convertToNewDurationType("days", "minutes", 1)).toBe(1440);
      
      // 3 days notice
      expect(convertToNewDurationType("days", "minutes", 3)).toBe(4320);
    });

    it("converts typical cancellation notice values", () => {
      // 30 minutes cancellation notice
      expect(convertToNewDurationType("minutes", "minutes", 30)).toBe(30);
      
      // 4 hours cancellation notice
      expect(convertToNewDurationType("hours", "minutes", 4)).toBe(240);
      
      // 2 days cancellation notice
      expect(convertToNewDurationType("days", "minutes", 2)).toBe(2880);
      
      // 1 week cancellation notice
      expect(convertToNewDurationType("days", "minutes", 7)).toBe(10080);
    });

    it("converts buffer time values", () => {
      // 5 minute buffer
      expect(convertToNewDurationType("minutes", "minutes", 5)).toBe(5);
      
      // 15 minute buffer
      expect(convertToNewDurationType("minutes", "minutes", 15)).toBe(15);
      
      // 30 minute buffer
      expect(convertToNewDurationType("minutes", "minutes", 30)).toBe(30);
      
      // 1 hour buffer
      expect(convertToNewDurationType("hours", "minutes", 1)).toBe(60);
    });
  });

  describe("Type safety and bounds", () => {
    it("handles maximum safe integer values", () => {
      const maxSafeMinutes = Number.MAX_SAFE_INTEGER;
      const result = convertToNewDurationType("minutes", "days", maxSafeMinutes);
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });

    it("handles minimum safe integer values", () => {
      const minSafeMinutes = Number.MIN_SAFE_INTEGER;
      const result = convertToNewDurationType("minutes", "days", minSafeMinutes);
      expect(result).toBeLessThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });

    it("maintains type consistency", () => {
      const result1 = convertToNewDurationType("minutes", "hours", 60);
      expect(typeof result1).toBe("number");
      
      const result2 = convertToNewDurationType("hours", "days", 24);
      expect(typeof result2).toBe("number");
      
      const result3 = convertToNewDurationType("days", "minutes", 1);
      expect(typeof result3).toBe("number");
    });
  });
});