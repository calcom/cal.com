import { describe, it, expect } from "vitest";
import findDurationType from "../findDurationType";

describe("findDurationType", () => {
  describe("Minutes detection", () => {
    it("identifies values less than 60 as minutes", () => {
      expect(findDurationType(0)).toBe("minutes");
      expect(findDurationType(1)).toBe("minutes");
      expect(findDurationType(15)).toBe("minutes");
      expect(findDurationType(30)).toBe("minutes");
      expect(findDurationType(45)).toBe("minutes");
      expect(findDurationType(59)).toBe("minutes");
    });

    it("identifies decimal values less than 60 as minutes", () => {
      expect(findDurationType(0.5)).toBe("minutes");
      expect(findDurationType(15.5)).toBe("minutes");
      expect(findDurationType(30.25)).toBe("minutes");
      expect(findDurationType(59.99)).toBe("minutes");
    });
  });

  describe("Hours detection", () => {
    it("identifies values from 60 to 1439 as hours", () => {
      expect(findDurationType(60)).toBe("hours");
      expect(findDurationType(90)).toBe("hours");
      expect(findDurationType(120)).toBe("hours");
      expect(findDurationType(180)).toBe("hours");
      expect(findDurationType(240)).toBe("hours");
      expect(findDurationType(300)).toBe("hours");
      expect(findDurationType(720)).toBe("hours");
      expect(findDurationType(1439)).toBe("hours");
    });

    it("identifies common hour values correctly", () => {
      expect(findDurationType(60)).toBe("hours");    // 1 hour
      expect(findDurationType(120)).toBe("hours");   // 2 hours
      expect(findDurationType(180)).toBe("hours");   // 3 hours
      expect(findDurationType(240)).toBe("hours");   // 4 hours
      expect(findDurationType(360)).toBe("hours");   // 6 hours
      expect(findDurationType(480)).toBe("hours");   // 8 hours
      expect(findDurationType(720)).toBe("hours");   // 12 hours
      expect(findDurationType(1080)).toBe("hours");  // 18 hours
    });

    it("identifies decimal hour values correctly", () => {
      expect(findDurationType(90)).toBe("hours");    // 1.5 hours
      expect(findDurationType(150)).toBe("hours");   // 2.5 hours
      expect(findDurationType(210)).toBe("hours");   // 3.5 hours
      expect(findDurationType(270)).toBe("hours");   // 4.5 hours
    });
  });

  describe("Days detection", () => {
    it("identifies values 1440 and above as days", () => {
      expect(findDurationType(1440)).toBe("days");   // 1 day
      expect(findDurationType(2880)).toBe("days");   // 2 days
      expect(findDurationType(4320)).toBe("days");   // 3 days
      expect(findDurationType(5760)).toBe("days");   // 4 days
      expect(findDurationType(7200)).toBe("days");   // 5 days
      expect(findDurationType(10080)).toBe("days");  // 7 days (1 week)
      expect(findDurationType(20160)).toBe("days");  // 14 days (2 weeks)
      expect(findDurationType(43200)).toBe("days");  // 30 days (1 month)
    });

    it("identifies partial day values correctly", () => {
      expect(findDurationType(2160)).toBe("days");   // 1.5 days
      expect(findDurationType(3600)).toBe("days");   // 2.5 days
      expect(findDurationType(5040)).toBe("days");   // 3.5 days
    });

    it("identifies very large values as days", () => {
      expect(findDurationType(100000)).toBe("days");
      expect(findDurationType(1000000)).toBe("days");
      expect(findDurationType(Number.MAX_SAFE_INTEGER)).toBe("days");
    });
  });

  describe("Edge cases", () => {
    it("handles boundary values correctly", () => {
      // Boundary between minutes and hours
      expect(findDurationType(59)).toBe("minutes");
      expect(findDurationType(60)).toBe("hours");
      expect(findDurationType(61)).toBe("hours");

      // Boundary between hours and days
      expect(findDurationType(1439)).toBe("hours");
      expect(findDurationType(1440)).toBe("days");
      expect(findDurationType(1441)).toBe("days");
    });

    it("handles zero value", () => {
      expect(findDurationType(0)).toBe("minutes");
    });

    it("handles negative values", () => {
      expect(findDurationType(-1)).toBe("minutes");
      expect(findDurationType(-30)).toBe("minutes");
      expect(findDurationType(-60)).toBe("minutes");
      expect(findDurationType(-100)).toBe("minutes");
      expect(findDurationType(-1440)).toBe("minutes");
      expect(findDurationType(-10000)).toBe("minutes");
    });

    it("handles decimal boundary values", () => {
      expect(findDurationType(59.9)).toBe("minutes");
      expect(findDurationType(60.1)).toBe("hours");
      expect(findDurationType(1439.9)).toBe("hours");
      expect(findDurationType(1440.1)).toBe("days");
    });

    it("handles very small decimal values", () => {
      expect(findDurationType(0.001)).toBe("minutes");
      expect(findDurationType(0.01)).toBe("minutes");
      expect(findDurationType(0.1)).toBe("minutes");
    });
  });

  describe("Invalid inputs", () => {
    it("handles NaN", () => {
      expect(findDurationType(NaN)).toBe("minutes");
    });

    it("handles Infinity", () => {
      expect(findDurationType(Infinity)).toBe("days");
      expect(findDurationType(-Infinity)).toBe("minutes");
    });

    it("handles null and undefined", () => {
      // @ts-expect-error Testing invalid input
      expect(findDurationType(null)).toBe("minutes");
      // @ts-expect-error Testing invalid input
      expect(findDurationType(undefined)).toBe("minutes");
    });

    it("handles string numbers", () => {
      // @ts-expect-error Testing invalid input
      expect(findDurationType("30")).toBe("minutes");
      // @ts-expect-error Testing invalid input
      expect(findDurationType("120")).toBe("hours");
      // @ts-expect-error Testing invalid input
      expect(findDurationType("1440")).toBe("days");
    });

    it("handles non-numeric strings", () => {
      // @ts-expect-error Testing invalid input
      expect(findDurationType("not a number")).toBe("minutes");
      // @ts-expect-error Testing invalid input
      expect(findDurationType("")).toBe("minutes");
    });
  });

  describe("Common use cases", () => {
    it("correctly identifies typical booking notice durations", () => {
      expect(findDurationType(0)).toBe("minutes");     // No notice
      expect(findDurationType(15)).toBe("minutes");    // 15 min notice
      expect(findDurationType(30)).toBe("minutes");    // 30 min notice
      expect(findDurationType(60)).toBe("hours");      // 1 hour notice
      expect(findDurationType(120)).toBe("hours");     // 2 hour notice
      expect(findDurationType(240)).toBe("hours");     // 4 hour notice
      expect(findDurationType(1440)).toBe("days");     // 1 day notice
      expect(findDurationType(2880)).toBe("days");     // 2 day notice
      expect(findDurationType(10080)).toBe("days");    // 1 week notice
    });

    it("correctly identifies typical cancellation notice durations", () => {
      expect(findDurationType(30)).toBe("minutes");    // 30 min cancellation
      expect(findDurationType(60)).toBe("hours");      // 1 hour cancellation
      expect(findDurationType(120)).toBe("hours");     // 2 hour cancellation
      expect(findDurationType(360)).toBe("hours");     // 6 hour cancellation
      expect(findDurationType(720)).toBe("hours");     // 12 hour cancellation
      expect(findDurationType(1440)).toBe("days");     // 24 hour cancellation
      expect(findDurationType(2880)).toBe("days");     // 48 hour cancellation
      expect(findDurationType(4320)).toBe("days");     // 72 hour cancellation
    });

    it("correctly identifies buffer time durations", () => {
      expect(findDurationType(5)).toBe("minutes");     // 5 min buffer
      expect(findDurationType(10)).toBe("minutes");    // 10 min buffer
      expect(findDurationType(15)).toBe("minutes");    // 15 min buffer
      expect(findDurationType(30)).toBe("minutes");    // 30 min buffer
      expect(findDurationType(45)).toBe("minutes");    // 45 min buffer
      expect(findDurationType(60)).toBe("hours");      // 1 hour buffer
      expect(findDurationType(90)).toBe("hours");      // 1.5 hour buffer
      expect(findDurationType(120)).toBe("hours");     // 2 hour buffer
    });

    it("correctly identifies meeting durations", () => {
      expect(findDurationType(15)).toBe("minutes");    // 15 min meeting
      expect(findDurationType(30)).toBe("minutes");    // 30 min meeting
      expect(findDurationType(45)).toBe("minutes");    // 45 min meeting
      expect(findDurationType(60)).toBe("hours");      // 1 hour meeting
      expect(findDurationType(90)).toBe("hours");      // 1.5 hour meeting
      expect(findDurationType(120)).toBe("hours");     // 2 hour meeting
      expect(findDurationType(180)).toBe("hours");     // 3 hour meeting
      expect(findDurationType(240)).toBe("hours");     // 4 hour meeting
      expect(findDurationType(480)).toBe("hours");     // 8 hour workshop
      expect(findDurationType(1440)).toBe("days");     // Full day event
      expect(findDurationType(2880)).toBe("days");     // 2 day event
    });
  });

  describe("Consistency with convertToNewDurationType", () => {
    it("provides consistent type detection for round-trip conversions", () => {
      // Test that findDurationType correctly identifies the expected type
      // after conversions
      
      // 2 hours = 120 minutes
      expect(findDurationType(120)).toBe("hours");
      
      // 1.5 days = 2160 minutes
      expect(findDurationType(2160)).toBe("days");
      
      // 0.5 hours = 30 minutes
      expect(findDurationType(30)).toBe("minutes");
      
      // 3 days = 4320 minutes
      expect(findDurationType(4320)).toBe("days");
    });
  });

  describe("Performance considerations", () => {
    it("handles a large number of calls efficiently", () => {
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        findDurationType(Math.random() * 10000);
      }
      
      const end = performance.now();
      const timePerCall = (end - start) / iterations;
      
      // Should be very fast - less than 0.01ms per call
      expect(timePerCall).toBeLessThan(0.01);
    });

    it("returns consistent results for the same input", () => {
      const testValues = [0, 30, 60, 120, 1440, 2880, 10080];
      
      testValues.forEach(value => {
        const result1 = findDurationType(value);
        const result2 = findDurationType(value);
        const result3 = findDurationType(value);
        
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });
    });
  });
});