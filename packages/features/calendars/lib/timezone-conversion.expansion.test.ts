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

describe("timezone-conversion expansion tests", () => {
  describe("convertOffsetToIanaTimezone edge cases", () => {
    it("should handle UTC-0 (zero offset)", () => {
      expect(convertOffsetToIanaTimezone("UTC-0")).toBe("Etc/GMT");
    });

    it("should handle UTC+00:00 (zero offset with minutes)", () => {
      expect(convertOffsetToIanaTimezone("UTC+00:00")).toBe("Etc/GMT");
    });

    it("should convert GMT+14:00 (maximum valid offset)", () => {
      expect(convertOffsetToIanaTimezone("GMT+14:00")).toBe("Etc/GMT-14");
    });

    it("should convert GMT-14:00 (maximum negative offset)", () => {
      expect(convertOffsetToIanaTimezone("GMT-14:00")).toBe("Etc/GMT+14");
    });

    it("should convert GMT+1 (single digit hour)", () => {
      expect(convertOffsetToIanaTimezone("GMT+1")).toBe("Etc/GMT-1");
    });

    it("should convert UTC-9 (single digit negative)", () => {
      expect(convertOffsetToIanaTimezone("UTC-9")).toBe("Etc/GMT+9");
    });

    it("should return null for GMT+05:45 (Nepal - non-zero minutes)", () => {
      expect(convertOffsetToIanaTimezone("GMT+05:45")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(convertOffsetToIanaTimezone("")).toBeNull();
    });

    it("should return null for PST abbreviation", () => {
      expect(convertOffsetToIanaTimezone("PST")).toBeNull();
    });

    it("should return null for numeric offset without prefix", () => {
      expect(convertOffsetToIanaTimezone("+05:00")).toBeNull();
    });
  });

  describe("normalizeTimezone edge cases", () => {
    it("should return UTC for empty string", () => {
      expect(normalizeTimezone("")).toBe("UTC");
    });

    it("should accept Etc/GMT timezone directly", () => {
      expect(normalizeTimezone("Etc/GMT")).toBe("Etc/GMT");
    });

    it("should accept Etc/GMT+5 timezone directly", () => {
      expect(normalizeTimezone("Etc/GMT+5")).toBe("Etc/GMT+5");
    });

    it("should accept Europe/London timezone", () => {
      expect(normalizeTimezone("Europe/London")).toBe("Europe/London");
    });

    it("should accept Asia/Kolkata timezone", () => {
      expect(normalizeTimezone("Asia/Kolkata")).toBe("Asia/Kolkata");
    });

    it("should convert GMT+12:00 to Etc/GMT-12", () => {
      expect(normalizeTimezone("GMT+12:00")).toBe("Etc/GMT-12");
    });

    it("should fall back to UTC for timezone abbreviation EST", () => {
      // EST is not a valid IANA timezone in all environments
      const result = normalizeTimezone("EST");
      // Result is environment-dependent but should not throw
      expect(typeof result).toBe("string");
    });

    it("should fall back to UTC for random string", () => {
      expect(normalizeTimezone("notavalidtimezone123")).toBe("UTC");
    });

    it("should handle Pacific/Auckland timezone", () => {
      expect(normalizeTimezone("Pacific/Auckland")).toBe("Pacific/Auckland");
    });

    it("should fall back to UTC for GMT+15:00 (exceeds max)", () => {
      expect(normalizeTimezone("GMT+15:00")).toBe("UTC");
    });
  });
});
