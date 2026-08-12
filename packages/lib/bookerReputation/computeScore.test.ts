import { describe, expect, it } from "vitest";

import {
  MIN_BOOKINGS,
  OCCASIONAL_THRESHOLD,
  RELIABLE_THRESHOLD,
} from "./constants";
import { bandForReputation, computeScore } from "./computeScore";

describe("computeScore", () => {
  describe("below minimum sample threshold (New booker band)", () => {
    it("returns null score + 'new' band when totalCount < MIN_BOOKINGS", () => {
      expect(computeScore(0, 0)).toEqual({ score: null, band: "new" });
      expect(computeScore(1, 1)).toEqual({ score: null, band: "new" });
      expect(computeScore(2, MIN_BOOKINGS - 1)).toEqual({
        score: null,
        band: "new",
      });
    });

    it("does not render a number even at 100% no-show rate under threshold", () => {
      // 1/1 would be 0% show-up; guard prevents the catastrophic-looking number.
      const result = computeScore(1, 1);
      expect(result.score).toBeNull();
      expect(result.band).toBe("new");
    });
  });

  describe("at/above minimum sample threshold", () => {
    it("computes 100 when no no-shows", () => {
      expect(computeScore(0, MIN_BOOKINGS)).toEqual({
        score: 100,
        band: "reliable",
      });
      expect(computeScore(0, 10)).toEqual({ score: 100, band: "reliable" });
    });

    it("computes exact rate and floors (no rounding up)", () => {
      // 1/3 no-show -> 100 * (1 - 1/3) = 66.67 -> floor 66
      expect(computeScore(1, 3)).toEqual({ score: 66, band: "frequent" });
      // 1/4 -> 75
      expect(computeScore(1, 4)).toEqual({ score: 75, band: "occasional" });
      // 2/10 -> 80
      expect(computeScore(2, 10)).toEqual({ score: 80, band: "occasional" });
    });
  });

  describe("band boundaries", () => {
    it("reliable band at RELIABLE_THRESHOLD exactly", () => {
      // noShowCount chosen so score == RELIABLE_THRESHOLD exactly
      // 3/20 no-show -> 100*(1 - 0.15) = 85
      expect(computeScore(3, 20)).toEqual({
        score: RELIABLE_THRESHOLD,
        band: "reliable",
      });
    });

    it("reliable band just above threshold", () => {
      expect(computeScore(2, 20)).toEqual({
        score: 90,
        band: "reliable",
      });
    });

    it("occasional band at OCCASIONAL_THRESHOLD exactly", () => {
      // 3/10 -> 70
      expect(computeScore(3, 10)).toEqual({
        score: OCCASIONAL_THRESHOLD,
        band: "occasional",
      });
    });

    it("occasional band just below RELIABLE_THRESHOLD", () => {
      // 4/20 -> 80
      expect(computeScore(4, 20)).toEqual({
        score: 80,
        band: "occasional",
      });
    });

    it("frequent band just below OCCASIONAL_THRESHOLD", () => {
      // 1/3 -> 66
      expect(computeScore(1, 3)).toEqual({ score: 66, band: "frequent" });
    });

    it("frequent band at zero score (all no-shows)", () => {
      expect(computeScore(5, 5)).toEqual({ score: 0, band: "frequent" });
    });
  });

  describe("defensive input guarding", () => {
    it("clamps noShowCount > totalCount down to totalCount (no negative scores)", () => {
      // impossible input — should never come from the DB query, but never return
      // a nonsensical score to the host.
      const result = computeScore(10, 3);
      expect(result.score).toBe(0);
      expect(result.band).toBe("frequent");
    });

    it("clamps score to [0, 100]", () => {
      // 0/3 -> 100 (top of range)
      expect(computeScore(0, 3).score).toBe(100);
      // 3/3 -> 0 (bottom of range) — already covered above
      expect(computeScore(3, 3).score).toBe(0);
    });
  });
});

describe("bandForReputation", () => {
  it("returns 'new' when reputation is null", () => {
    expect(bandForReputation(null)).toBe("new");
  });

  it("returns 'new' when score is null (below min samples)", () => {
    expect(bandForReputation({ score: null })).toBe("new");
  });

  it("delegates to bandForScore for valid scores", () => {
    expect(bandForReputation({ score: 90 })).toBe("reliable");
    expect(bandForReputation({ score: 70 })).toBe("occasional");
    expect(bandForReputation({ score: 50 })).toBe("frequent");
  });
});