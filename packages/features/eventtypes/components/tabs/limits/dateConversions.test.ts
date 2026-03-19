import { describe, expect, it } from "vitest";

/**
 * These functions are extracted from EventLimitsTab.tsx for testing.
 * They handle the conversion between UTC midnight dates (used for storage)
 * and local midnight dates (used for display in the DateRangePicker).
 */
const toUTCMidnight = (date: Date | undefined): Date | undefined => {
  if (!date) return undefined;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const fromUTCMidnight = (date: Date | undefined): Date | undefined => {
  if (!date) return undefined;
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

describe("Date range period type timezone conversions", () => {
  describe("toUTCMidnight", () => {
    it("returns undefined for undefined input", () => {
      expect(toUTCMidnight(undefined)).toBeUndefined();
    });

    it("converts a local date to UTC midnight for the same calendar date", () => {
      // Local midnight March 23 in any timezone
      const localDate = new Date(2026, 2, 23); // March 23, 2026 local midnight
      const result = toUTCMidnight(localDate);

      expect(result).toBeDefined();
      expect(result?.toISOString()).toBe("2026-03-23T00:00:00.000Z");
    });

    it("preserves the calendar date regardless of local time", () => {
      // Even with a non-midnight local time, it should extract the date
      const localDate = new Date(2026, 5, 15, 14, 30, 0); // June 15, 2:30 PM local
      const result = toUTCMidnight(localDate);

      expect(result?.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });
  });

  describe("fromUTCMidnight", () => {
    it("returns undefined for undefined input", () => {
      expect(fromUTCMidnight(undefined)).toBeUndefined();
    });

    it("converts a UTC midnight date to local midnight for the same calendar date", () => {
      // UTC midnight March 23
      const utcDate = new Date("2026-03-23T00:00:00.000Z");
      const result = fromUTCMidnight(utcDate);

      expect(result).toBeDefined();
      // The local date should represent March 23 regardless of timezone
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(2); // March (0-indexed)
      expect(result?.getDate()).toBe(23);
    });

    it("correctly handles year boundaries", () => {
      // UTC midnight Jan 1
      const utcDate = new Date("2027-01-01T00:00:00.000Z");
      const result = fromUTCMidnight(utcDate);

      expect(result?.getFullYear()).toBe(2027);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(1);
    });

    it("correctly handles month boundaries", () => {
      // UTC midnight March 1 (after Feb)
      const utcDate = new Date("2026-03-01T00:00:00.000Z");
      const result = fromUTCMidnight(utcDate);

      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(2); // March
      expect(result?.getDate()).toBe(1);
    });
  });

  describe("round-trip conversion", () => {
    it("toUTCMidnight -> fromUTCMidnight preserves the calendar date", () => {
      const originalLocal = new Date(2026, 2, 23); // March 23 local
      const utcMidnight = toUTCMidnight(originalLocal);
      const backToLocal = fromUTCMidnight(utcMidnight);

      expect(backToLocal?.getFullYear()).toBe(2026);
      expect(backToLocal?.getMonth()).toBe(2);
      expect(backToLocal?.getDate()).toBe(23);
    });

    it("fromUTCMidnight -> toUTCMidnight preserves the UTC date", () => {
      const originalUTC = new Date("2026-03-23T00:00:00.000Z");
      const localMidnight = fromUTCMidnight(originalUTC);
      const backToUTC = toUTCMidnight(localMidnight);

      expect(backToUTC?.toISOString()).toBe("2026-03-23T00:00:00.000Z");
    });

    it("handles multiple dates across different months", () => {
      const dates = [
        new Date("2026-01-15T00:00:00.000Z"),
        new Date("2026-06-30T00:00:00.000Z"),
        new Date("2026-12-31T00:00:00.000Z"),
      ];

      for (const utcDate of dates) {
        const local = fromUTCMidnight(utcDate);
        const roundTripped = toUTCMidnight(local);
        expect(roundTripped?.toISOString()).toBe(utcDate.toISOString());
      }
    });
  });
});
