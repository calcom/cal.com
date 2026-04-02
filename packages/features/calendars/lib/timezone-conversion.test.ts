import { describe, expect, it, vi } from "vitest";
import { convertOffsetToIanaTimezone, normalizeTimezone } from "./timezone-conversion";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

describe("timezone-conversion", () => {
  describe("Intl.DateTimeFormat behavior with offset formats", () => {
    it("throws RangeError for GMT-05:00 offset format", () => {
      expect(() => Intl.DateTimeFormat(undefined, { timeZone: "GMT-05:00" })).toThrow(RangeError);
    });

    it("throws RangeError for UTC+08:00 offset format", () => {
      expect(() => Intl.DateTimeFormat(undefined, { timeZone: "UTC+08:00" })).toThrow(RangeError);
    });

    it("throws RangeError for GMT+5 offset format without minutes", () => {
      expect(() => Intl.DateTimeFormat(undefined, { timeZone: "GMT+5" })).toThrow(RangeError);
    });

    it("accepts valid IANA timezone America/New_York", () => {
      expect(() => Intl.DateTimeFormat(undefined, { timeZone: "America/New_York" })).not.toThrow();
    });

    it("accepts Etc/GMT+5 as valid IANA timezone", () => {
      expect(() => Intl.DateTimeFormat(undefined, { timeZone: "Etc/GMT+5" })).not.toThrow();
    });

    it("accepts UTC as valid timezone", () => {
      expect(() => Intl.DateTimeFormat(undefined, { timeZone: "UTC" })).not.toThrow();
    });
  });

  describe("convertOffsetToIanaTimezone", () => {
    it("converts GMT-05:00 to Etc/GMT+5 (inverted sign)", () => {
      expect(convertOffsetToIanaTimezone("GMT-05:00")).toBe("Etc/GMT+5");
    });

    it("converts UTC+08:00 to Etc/GMT-8 (inverted sign)", () => {
      expect(convertOffsetToIanaTimezone("UTC+08:00")).toBe("Etc/GMT-8");
    });

    it("converts GMT+0 to Etc/GMT", () => {
      expect(convertOffsetToIanaTimezone("GMT+0")).toBe("Etc/GMT");
    });

    it("converts GMT-00:00 to Etc/GMT", () => {
      expect(convertOffsetToIanaTimezone("GMT-00:00")).toBe("Etc/GMT");
    });

    it("handles case insensitivity (gmt-05:00)", () => {
      expect(convertOffsetToIanaTimezone("gmt-05:00")).toBe("Etc/GMT+5");
    });

    it("handles format without minutes (GMT+5)", () => {
      expect(convertOffsetToIanaTimezone("GMT+5")).toBe("Etc/GMT-5");
    });

    it("returns null for non-zero minutes (cannot be represented in Etc/GMT)", () => {
      expect(convertOffsetToIanaTimezone("GMT+05:30")).toBeNull();
    });

    it("returns null for hours > 14", () => {
      expect(convertOffsetToIanaTimezone("GMT+15:00")).toBeNull();
    });

    it("returns null for invalid format", () => {
      expect(convertOffsetToIanaTimezone("America/New_York")).toBeNull();
    });

    it("returns null for completely invalid string", () => {
      expect(convertOffsetToIanaTimezone("InvalidTimezone")).toBeNull();
    });
  });

  describe("normalizeTimezone", () => {
    it("returns UTC for undefined timezone", () => {
      expect(normalizeTimezone(undefined)).toBe("UTC");
    });

    it("returns valid IANA timezone as-is", () => {
      expect(normalizeTimezone("America/New_York")).toBe("America/New_York");
    });

    it("converts GMT-05:00 to Etc/GMT+5", () => {
      expect(normalizeTimezone("GMT-05:00")).toBe("Etc/GMT+5");
    });

    it("converts UTC+08:00 to Etc/GMT-8", () => {
      expect(normalizeTimezone("UTC+08:00")).toBe("Etc/GMT-8");
    });

    it("falls back to UTC for completely invalid timezone", () => {
      expect(normalizeTimezone("InvalidTimezone")).toBe("UTC");
    });

    it("falls back to UTC for non-zero minutes offset", () => {
      expect(normalizeTimezone("GMT+05:30")).toBe("UTC");
    });
  });
});
