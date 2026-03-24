import { describe, expect, it } from "vitest";

import { shouldSkipDunningAdvancement } from "../shouldSkipDunningAdvancement";

describe("shouldSkipDunningAdvancement", () => {
  describe("enterprise plans", () => {
    it("allows advancement from CURRENT (to WARNING)", () => {
      expect(shouldSkipDunningAdvancement("ENTERPRISE", "CURRENT")).toBe(false);
    });

    it("skips advancement from WARNING (would go to SOFT_BLOCKED)", () => {
      expect(shouldSkipDunningAdvancement("ENTERPRISE", "WARNING")).toBe(true);
    });

    it("skips advancement from SOFT_BLOCKED", () => {
      expect(shouldSkipDunningAdvancement("ENTERPRISE", "SOFT_BLOCKED")).toBe(true);
    });

    it("skips advancement from HARD_BLOCKED", () => {
      expect(shouldSkipDunningAdvancement("ENTERPRISE", "HARD_BLOCKED")).toBe(true);
    });

    it("skips advancement from CANCELLED", () => {
      expect(shouldSkipDunningAdvancement("ENTERPRISE", "CANCELLED")).toBe(true);
    });
  });

  describe("non-enterprise plans", () => {
    it("allows advancement for TEAM plan at any status", () => {
      expect(shouldSkipDunningAdvancement("TEAM", "CURRENT")).toBe(false);
      expect(shouldSkipDunningAdvancement("TEAM", "WARNING")).toBe(false);
      expect(shouldSkipDunningAdvancement("TEAM", "SOFT_BLOCKED")).toBe(false);
      expect(shouldSkipDunningAdvancement("TEAM", "HARD_BLOCKED")).toBe(false);
    });

    it("allows advancement for ORGANIZATION plan at any status", () => {
      expect(shouldSkipDunningAdvancement("ORGANIZATION", "CURRENT")).toBe(false);
      expect(shouldSkipDunningAdvancement("ORGANIZATION", "WARNING")).toBe(false);
      expect(shouldSkipDunningAdvancement("ORGANIZATION", "SOFT_BLOCKED")).toBe(false);
    });

    it("allows advancement when plan is null", () => {
      expect(shouldSkipDunningAdvancement(null, "WARNING")).toBe(false);
      expect(shouldSkipDunningAdvancement(null, null)).toBe(false);
    });
  });
});
