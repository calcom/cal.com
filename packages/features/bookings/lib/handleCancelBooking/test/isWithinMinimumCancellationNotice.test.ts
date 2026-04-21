import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { isWithinMinimumCancellationNotice } from "../isWithinMinimumCancellationNotice";

describe("isWithinMinimumCancellationNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when cancellationNoticeHours is null or 0", () => {
    it("should return false when cancellationNoticeHours is null", () => {
      const bookingStartTime = new Date(Date.now() + 60 * 60 * 1000);
      const result = isWithinMinimumCancellationNotice(bookingStartTime, null);
      expect(result).toBe(false);
    });

    it("should return false when cancellationNoticeHours is 0", () => {
      const bookingStartTime = new Date(Date.now() + 60 * 60 * 1000);
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 0);
      expect(result).toBe(false);
    });

    it("should return false when cancellationNoticeHours is negative", () => {
      const bookingStartTime = new Date(Date.now() + 60 * 60 * 1000);
      const result = isWithinMinimumCancellationNotice(bookingStartTime, -1);
      expect(result).toBe(false);
    });
  });

  describe("when bookingStartTime is null", () => {
    it("should return false", () => {
      const result = isWithinMinimumCancellationNotice(null, 24);
      expect(result).toBe(false);
    });
  });

  describe("when booking is within cancellation notice period", () => {
    it("should return true when booking is 1 hour away and notice period is 24 hours", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-15T11:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 24);

      expect(result).toBe(true);
    });

    it("should return true when booking is 23 hours away and notice period is 24 hours", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-16T09:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 24);

      expect(result).toBe(true);
    });

    it("should return true when booking is 30 minutes away and notice period is 1 hour", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-15T10:30:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 1);

      expect(result).toBe(true);
    });
  });

  describe("when booking is outside cancellation notice period", () => {
    it("should return false when booking is 25 hours away and notice period is 24 hours", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-16T11:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 24);

      expect(result).toBe(false);
    });

    it("should return false when booking is exactly 24 hours away (edge case)", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-16T10:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 24);

      expect(result).toBe(false);
    });

    it("should return false when booking is 2 hours away and notice period is 1 hour", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-15T12:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 1);

      expect(result).toBe(false);
    });
  });

  describe("when booking has already passed", () => {
    it("should return false when booking started 1 hour ago", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-15T09:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 24);

      expect(result).toBe(false);
    });

    it("should return false when booking is starting exactly now", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-15T10:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 24);

      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle Date objects as input", () => {
      const now = new Date("2024-01-15T10:00:00Z");
      vi.setSystemTime(now);

      const bookingStartTime = new Date("2024-01-15T11:00:00Z");
      const result = isWithinMinimumCancellationNotice(bookingStartTime, 24);

      expect(result).toBe(true);
    });
  });
});
