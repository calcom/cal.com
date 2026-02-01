import { describe, it, expect } from "vitest";

import { compareTimeRanges } from "./useSchedule";

describe("compareTimeRanges", () => {
  describe("when there is no previous range", () => {
    it("returns the new range with no reuse or overlap", () => {
      const result = compareTimeRanges(
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-01-31T23:59:59.999Z" },
        null
      );

      expect(result).toEqual({
        startTime: "2026-01-01T00:00:00.000Z",
        endTime: "2026-01-31T23:59:59.999Z",
        reusePrevious: false,
        overlapsWithPrevious: false,
      });
    });
  });

  describe("when the new range is fully covered by the previous range", () => {
    it("reuses the previous range (month auto-advance after prefetch)", () => {
      // First query fetched Jan→Mar, then month auto-advances to Feb→Mar
      const result = compareTimeRanges(
        { startTime: "2026-02-01T00:00:00.000Z", endTime: "2026-02-28T23:59:59.999Z" },
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-02-28T23:59:59.999Z" }
      );

      expect(result).toEqual({
        startTime: "2026-01-01T00:00:00.000Z",
        endTime: "2026-02-28T23:59:59.999Z",
        reusePrevious: true,
        overlapsWithPrevious: false,
      });
    });

    it("reuses when new range is identical to previous", () => {
      const range = { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-01-31T23:59:59.999Z" };
      const result = compareTimeRanges(range, range);

      expect(result.reusePrevious).toBe(true);
      expect(result.overlapsWithPrevious).toBe(false);
      expect(result.startTime).toBe(range.startTime);
      expect(result.endTime).toBe(range.endTime);
    });

    it("reuses when new range is a strict subset", () => {
      // Previous fetched Jan→Mar, new range is just February
      const result = compareTimeRanges(
        { startTime: "2026-02-01T00:00:00.000Z", endTime: "2026-02-28T23:59:59.999Z" },
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-03-31T23:59:59.999Z" }
      );

      expect(result.reusePrevious).toBe(true);
      expect(result.startTime).toBe("2026-01-01T00:00:00.000Z");
      expect(result.endTime).toBe("2026-03-31T23:59:59.999Z");
    });
  });

  describe("when the new range partially overlaps with the previous range", () => {
    it("signals overlap when endTime extends beyond previous (bookerState transition widens range)", () => {
      // First query fetched Jan only, then bookerState transition widens to Jan→Feb
      const result = compareTimeRanges(
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-02-28T23:59:59.999Z" },
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-01-31T23:59:59.999Z" }
      );

      expect(result).toEqual({
        startTime: "2026-01-01T00:00:00.000Z",
        endTime: "2026-02-28T23:59:59.999Z",
        reusePrevious: false,
        overlapsWithPrevious: true,
      });
    });

    it("signals overlap when startTime is earlier than previous", () => {
      // New range starts earlier but overlaps
      const result = compareTimeRanges(
        { startTime: "2025-12-01T00:00:00.000Z", endTime: "2026-01-31T23:59:59.999Z" },
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-02-28T23:59:59.999Z" }
      );

      expect(result.reusePrevious).toBe(false);
      expect(result.overlapsWithPrevious).toBe(true);
    });

    it("signals overlap when new range fully contains previous", () => {
      // New range is wider on both sides
      const result = compareTimeRanges(
        { startTime: "2025-12-01T00:00:00.000Z", endTime: "2026-03-31T23:59:59.999Z" },
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-02-28T23:59:59.999Z" }
      );

      expect(result.reusePrevious).toBe(false);
      expect(result.overlapsWithPrevious).toBe(true);
    });
  });

  describe("when the new range has no overlap with the previous range", () => {
    it("returns no overlap for completely separate ranges", () => {
      // User navigates from January to May (no overlap)
      const result = compareTimeRanges(
        { startTime: "2026-05-01T00:00:00.000Z", endTime: "2026-05-31T23:59:59.999Z" },
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-01-31T23:59:59.999Z" }
      );

      expect(result).toEqual({
        startTime: "2026-05-01T00:00:00.000Z",
        endTime: "2026-05-31T23:59:59.999Z",
        reusePrevious: false,
        overlapsWithPrevious: false,
      });
    });

    it("returns no overlap when ranges are adjacent but not overlapping", () => {
      // Feb starts exactly where Jan ends — no actual shared data
      const result = compareTimeRanges(
        { startTime: "2026-02-01T00:00:00.000Z", endTime: "2026-02-28T23:59:59.999Z" },
        { startTime: "2026-01-01T00:00:00.000Z", endTime: "2026-01-31T23:59:59.999Z" }
      );

      expect(result.reusePrevious).toBe(false);
      expect(result.overlapsWithPrevious).toBe(false);
    });
  });
});
