import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import { extractDateParameters, getUnitFromBusyTime, isBookingWithinPeriod } from "./utils";

describe("extractDateParameters", () => {
  it("extracts date parameters from a booking within a period", () => {
    const booking = { start: new Date("2024-06-15T10:00:00Z"), end: new Date("2024-06-15T11:00:00Z") };
    const periodStart = dayjs("2024-06-01T00:00:00Z").utc();
    const periodEnd = dayjs("2024-06-30T23:59:59Z").utc();

    const result = extractDateParameters(booking, periodStart, periodEnd, "UTC");

    expect(result.bookingDay).toBe("2024-06-15");
    expect(result.periodStartDay).toBe("2024-06-01");
    expect(result.periodEndDay).toBe("2024-06-30");
  });

  it("formats dates in the given timezone", () => {
    // A booking at 2024-06-15T02:00:00Z is still June 14 in America/New_York (UTC-4)
    const booking = { start: new Date("2024-06-15T02:00:00Z"), end: new Date("2024-06-15T03:00:00Z") };
    const periodStart = dayjs("2024-06-01T00:00:00Z").utc();
    const periodEnd = dayjs("2024-06-30T23:59:59Z").utc();

    const result = extractDateParameters(booking, periodStart, periodEnd, "America/New_York");

    expect(result.bookingDay).toBe("2024-06-14");
  });
});

describe("isBookingWithinPeriod", () => {
  const periodStart = dayjs("2024-06-01T00:00:00Z").utc();
  const periodEnd = dayjs("2024-06-30T23:59:59Z").utc();

  it("returns true when booking is within the period", () => {
    const booking = { start: new Date("2024-06-15T10:00:00Z"), end: new Date("2024-06-15T11:00:00Z") };
    expect(isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC")).toBe(true);
  });

  it("returns true when booking is on the period start day", () => {
    const booking = { start: new Date("2024-06-01T10:00:00Z"), end: new Date("2024-06-01T11:00:00Z") };
    expect(isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC")).toBe(true);
  });

  it("returns true when booking is on the period end day", () => {
    const booking = { start: new Date("2024-06-30T10:00:00Z"), end: new Date("2024-06-30T11:00:00Z") };
    expect(isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC")).toBe(true);
  });

  it("returns false when booking is before the period", () => {
    const booking = { start: new Date("2024-05-31T10:00:00Z"), end: new Date("2024-05-31T11:00:00Z") };
    expect(isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC")).toBe(false);
  });

  it("returns false when booking is after the period", () => {
    const booking = { start: new Date("2024-07-01T10:00:00Z"), end: new Date("2024-07-01T11:00:00Z") };
    expect(isBookingWithinPeriod(booking, periodStart, periodEnd, "UTC")).toBe(false);
  });
});

describe("getUnitFromBusyTime", () => {
  it("returns 'day' for less than a week", () => {
    const start = dayjs("2024-06-01T00:00:00Z").utc();
    const end = dayjs("2024-06-03T00:00:00Z").utc();
    expect(getUnitFromBusyTime(start, end)).toBe("day");
  });

  it("returns 'week' for at least 1 week but less than 1 month", () => {
    const start = dayjs("2024-06-01T00:00:00Z").utc();
    const end = dayjs("2024-06-15T00:00:00Z").utc();
    expect(getUnitFromBusyTime(start, end)).toBe("week");
  });

  it("returns 'month' for at least 1 month but less than 1 year", () => {
    const start = dayjs("2024-06-01T00:00:00Z").utc();
    const end = dayjs("2024-09-01T00:00:00Z").utc();
    expect(getUnitFromBusyTime(start, end)).toBe("month");
  });

  it("returns 'year' for at least 1 year", () => {
    const start = dayjs("2024-06-01T00:00:00Z").utc();
    const end = dayjs("2025-06-01T00:00:00Z").utc();
    expect(getUnitFromBusyTime(start, end)).toBe("year");
  });

  it("returns 'day' for same-day range", () => {
    const start = dayjs("2024-06-01T00:00:00Z").utc();
    const end = dayjs("2024-06-01T23:59:59Z").utc();
    expect(getUnitFromBusyTime(start, end)).toBe("day");
  });
});
