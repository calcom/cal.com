import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTimeString } from "./ScheduleComponent";

describe("parseTimeString", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a consistent date for testing
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("24-hour format (timeFormat = 24 or null)", () => {
    it("should parse valid 24h format (HH:mm)", () => {
      const result = parseTimeString("16:05", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should parse valid 24h format with single digit hour (via h:mma fallback)", () => {
      const result = parseTimeString("8:05am", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(8);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should parse valid 12h format when user prefers 24h (format fallback)", () => {
      const result = parseTimeString("4:05pm", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should parse midnight (00:00)", () => {
      const result = parseTimeString("00:00", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(0);
      expect(result?.getUTCMinutes()).toBe(0);
    });

    it("should parse end of day (23:59)", () => {
      const result = parseTimeString("23:59", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(23);
      expect(result?.getUTCMinutes()).toBe(59);
    });

    it("should return null for invalid hours (> 23)", () => {
      const result = parseTimeString("24:00", 24);
      expect(result).toBeNull();
    });

    it("should return null for invalid minutes (> 59)", () => {
      const result = parseTimeString("16:60", 24);
      expect(result).toBeNull();
    });

    it("should return null for negative hours", () => {
      const result = parseTimeString("-1:00", 24);
      expect(result).toBeNull();
    });

    it("should return null for negative minutes", () => {
      const result = parseTimeString("16:-5", 24);
      expect(result).toBeNull();
    });

    it("should return null for invalid format", () => {
      const result = parseTimeString("invalid", 24);
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseTimeString("", 24);
      expect(result).toBeNull();
    });

    it("should return null for whitespace only", () => {
      const result = parseTimeString("   ", 24);
      expect(result).toBeNull();
    });

    it("should handle null timeFormat as 24h", () => {
      const result = parseTimeString("16:05", null);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });
  });

  describe("12-hour format (timeFormat = 12)", () => {
    it("should parse valid 12h format with am (h:mma)", () => {
      const result = parseTimeString("4:05am", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(4);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should parse valid 12h format with pm (h:mma)", () => {
      const result = parseTimeString("4:05pm", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should parse valid 12h format with single digit hour", () => {
      const result = parseTimeString("8:30am", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(8);
      expect(result?.getUTCMinutes()).toBe(30);
    });

    it("should parse 12:00am (midnight)", () => {
      const result = parseTimeString("12:00am", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(0);
      expect(result?.getUTCMinutes()).toBe(0);
    });

    it("should parse 12:00pm (noon)", () => {
      const result = parseTimeString("12:00pm", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(12);
      expect(result?.getUTCMinutes()).toBe(0);
    });

    it("should parse 11:59pm (end of day)", () => {
      const result = parseTimeString("11:59pm", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(23);
      expect(result?.getUTCMinutes()).toBe(59);
    });

    it("should parse valid 24h format when user prefers 12h (format fallback)", () => {
      const result = parseTimeString("16:05", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should return null for invalid format", () => {
      const result = parseTimeString("invalid", 12);
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseTimeString("", 12);
      expect(result).toBeNull();
    });
  });

  describe("custom times (5-minute intervals)", () => {
    it("should parse 16:05 in 24h format", () => {
      const result = parseTimeString("16:05", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should parse 08:20 in 24h format", () => {
      const result = parseTimeString("08:20", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(8);
      expect(result?.getUTCMinutes()).toBe(20);
    });

    it("should parse 4:05pm in 12h format", () => {
      const result = parseTimeString("4:05pm", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should parse 8:20am in 12h format", () => {
      const result = parseTimeString("8:20am", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(8);
      expect(result?.getUTCMinutes()).toBe(20);
    });
  });

  describe("edge cases", () => {
    it("should handle times with leading zeros", () => {
      const result = parseTimeString("09:05", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(9);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should handle times without leading zeros (via h:mma fallback)", () => {
      const result = parseTimeString("9:05am", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(9);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should set seconds and milliseconds to 0", () => {
      const result = parseTimeString("16:05", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCSeconds()).toBe(0);
      expect(result?.getUTCMilliseconds()).toBe(0);
    });

    it("should preserve exact minutes (no rounding)", () => {
      const result = parseTimeString("16:07", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCMinutes()).toBe(7);
    });

    it("should preserve exact minutes in 12h format (no rounding)", () => {
      const result = parseTimeString("4:07pm", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCMinutes()).toBe(7);
    });
  });

  describe("format acceptance (both formats)", () => {
    it("should accept 24h format when user prefers 12h (format fallback)", () => {
      const result = parseTimeString("16:05", 12);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });

    it("should accept 12h format when user prefers 24h (format fallback)", () => {
      const result = parseTimeString("4:05pm", 24);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(16);
      expect(result?.getUTCMinutes()).toBe(5);
    });
  });
});
