import { describe, expect, it } from "vitest";
import { getUTCOffsetByTimezone } from "./index";

describe("getUTCOffsetByTimezone", () => {
  describe("DST-aware behavior when date is provided", () => {
    it("returns PST offset (-480) for America/Los_Angeles in January", () => {
      const january = "2024-01-15T12:00:00Z";
      expect(getUTCOffsetByTimezone("America/Los_Angeles", january)).toBe(-480);
    });

    it("returns PDT offset (-420) for America/Los_Angeles in July", () => {
      const july = "2024-07-15T12:00:00Z";
      expect(getUTCOffsetByTimezone("America/Los_Angeles", july)).toBe(-420);
    });

    it("returns different offsets for the same timezone across DST boundary", () => {
      const winter = "2024-01-15T12:00:00Z";
      const summer = "2024-07-15T12:00:00Z";
      const winterOffset = getUTCOffsetByTimezone("America/Los_Angeles", winter);
      const summerOffset = getUTCOffsetByTimezone("America/Los_Angeles", summer);
      expect(winterOffset).not.toBe(summerOffset);
      expect((summerOffset ?? 0) - (winterOffset ?? 0)).toBe(60);
    });

    it("returns EST offset (-300) for America/New_York in January", () => {
      expect(getUTCOffsetByTimezone("America/New_York", "2024-01-15T12:00:00Z")).toBe(-300);
    });

    it("returns EDT offset (-240) for America/New_York in July", () => {
      expect(getUTCOffsetByTimezone("America/New_York", "2024-07-15T12:00:00Z")).toBe(-240);
    });
  });

  describe("non-DST timezones return consistent offsets regardless of date", () => {
    it("returns +330 for Asia/Kolkata in both January and July", () => {
      const january = "2024-01-15T12:00:00Z";
      const july = "2024-07-15T12:00:00Z";
      expect(getUTCOffsetByTimezone("Asia/Kolkata", january)).toBe(330);
      expect(getUTCOffsetByTimezone("Asia/Kolkata", july)).toBe(330);
    });

    it("returns 0 for UTC in both January and July", () => {
      expect(getUTCOffsetByTimezone("UTC", "2024-01-15T12:00:00Z")).toBe(0);
      expect(getUTCOffsetByTimezone("UTC", "2024-07-15T12:00:00Z")).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("returns null for empty timezone string", () => {
      expect(getUTCOffsetByTimezone("")).toBeNull();
    });

    it("accepts a Date object as the date parameter", () => {
      const date = new Date("2024-07-15T12:00:00Z");
      expect(getUTCOffsetByTimezone("America/Los_Angeles", date)).toBe(-420);
    });

    it("uses current time when date is omitted", () => {
      const offset = getUTCOffsetByTimezone("Asia/Kolkata");
      expect(offset).toBe(330);
    });
  });
});
