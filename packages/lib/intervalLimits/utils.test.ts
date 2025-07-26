import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import type { EventBusyDetails } from "@calcom/types/Calendar";

import { isBookingWithinPeriod, extractDateParameters, getUnitFromBusyTime } from "./utils";

const createMockBooking = (start: string, end: string, title = "Test Booking"): EventBusyDetails => ({
  start: new Date(start),
  end: new Date(end),
  title,
  source: "test",
  userId: 1,
});

describe("intervalLimits utils", () => {
  describe("extractDateParameters", () => {
    it("should extract correct date parameters", () => {
      const booking = createMockBooking("2024-01-15T10:00:00Z", "2024-01-15T11:00:00Z");
      const periodStart = dayjs("2024-01-15").startOf("day");
      const periodEnd = dayjs("2024-01-15").endOf("day");

      const result = extractDateParameters(booking, periodStart, periodEnd, "UTC");

      expect(result.bookingDay).toBe("2024-01-15");
      expect(result.periodStartDay).toBe("2024-01-15");
      expect(result.periodEndDay).toBe("2024-01-15");
    });

    it("should handle timezone conversions correctly", () => {
      const booking = createMockBooking("2024-01-15T10:00:00Z", "2024-01-15T11:00:00Z");
      const periodStart = dayjs("2024-01-15").startOf("day");
      const periodEnd = dayjs("2024-01-15").endOf("day");

      const result = extractDateParameters(booking, periodStart, periodEnd, "America/New_York");

      expect(result.bookingStart.format("Z")).toContain("-");
    });
  });

  describe("isBookingWithinPeriod", () => {
    it("should return true for booking within period", () => {
      const booking = createMockBooking("2024-01-15T10:00:00Z", "2024-01-15T11:00:00Z");
      const periodStart = dayjs("2024-01-15").startOf("day");
      const periodEnd = dayjs("2024-01-15").endOf("day");

      const result = isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC");

      expect(result).toBe(true);
    });

    it("should return false for booking outside period", () => {
      const booking = createMockBooking("2024-01-16T10:00:00Z", "2024-01-16T11:00:00Z");
      const periodStart = dayjs("2024-01-15").startOf("day");
      const periodEnd = dayjs("2024-01-15").endOf("day");

      const result = isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC");

      expect(result).toBe(false);
    });

    it("should handle edge cases at period boundaries", () => {
      const booking = createMockBooking("2024-01-15T23:59:59Z", "2024-01-16T00:30:00Z");
      const periodStart = dayjs("2024-01-15").startOf("day");
      const periodEnd = dayjs("2024-01-15").endOf("day");

      const result = isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC");

      expect(result).toBe(true);
    });

    it("should handle timezone-aware period checking", () => {
      const booking = createMockBooking("2024-01-15T23:00:00Z", "2024-01-16T00:00:00Z");
      const periodStart = dayjs("2024-01-15").startOf("day");
      const periodEnd = dayjs("2024-01-15").endOf("day");

      const resultUTC = isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC");
      const resultEST = isBookingWithinPeriod(booking, periodStart, periodEnd, "America/New_York");

      expect(resultUTC).toBe(true);
      expect(resultEST).toBe(true);
    });
  });

  describe("getUnitFromBusyTime", () => {
    it("should return 'year' for year-long periods", () => {
      const start = dayjs("2024-01-01");
      const end = dayjs("2025-01-01");

      const result = getUnitFromBusyTime(start, end);

      expect(result).toBe("year");
    });

    it("should return 'month' for month-long periods", () => {
      const start = dayjs("2024-01-01");
      const end = dayjs("2024-02-01");

      const result = getUnitFromBusyTime(start, end);

      expect(result).toBe("month");
    });

    it("should return 'week' for week-long periods", () => {
      const start = dayjs("2024-01-01");
      const end = dayjs("2024-01-08");

      const result = getUnitFromBusyTime(start, end);

      expect(result).toBe("week");
    });

    it("should return 'day' for day-long periods", () => {
      const start = dayjs("2024-01-01");
      const end = dayjs("2024-01-02");

      const result = getUnitFromBusyTime(start, end);

      expect(result).toBe("day");
    });

    it("should default to 'day' for shorter periods", () => {
      const start = dayjs("2024-01-01T10:00:00");
      const end = dayjs("2024-01-01T11:00:00");

      const result = getUnitFromBusyTime(start, end);

      expect(result).toBe("day");
    });
  });
});
