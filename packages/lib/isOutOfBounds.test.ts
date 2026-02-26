import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { PeriodType } from "@calcom/prisma/enums";

import {
  BookingDateInPastError,
  calculatePeriodLimits,
  getPastTimeAndMinimumBookingNoticeBoundsStatus,
  getRollingWindowEndDate,
  isTimeOutOfBounds,
  isTimeViolatingFutureLimit,
} from "./isOutOfBounds";

vi.mock("./logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      silly: vi.fn(),
    }),
  },
}));

vi.mock("./safeStringify", () => ({
  safeStringify: vi.fn((v: unknown) => JSON.stringify(v)),
}));

describe("BookingDateInPastError", () => {
  it("is an instance of Error", () => {
    const err = new BookingDateInPastError();
    expect(err).toBeInstanceOf(Error);
  });

  it("has a default message", () => {
    const err = new BookingDateInPastError();
    expect(err.message).toBe("Attempting to book a meeting in the past.");
  });

  it("accepts a custom message", () => {
    const err = new BookingDateInPastError("Custom past error");
    expect(err.message).toBe("Custom past error");
  });
});

describe("isTimeOutOfBounds", () => {
  it("does not throw for a future date", () => {
    const futureDate = dayjs().add(1, "day");
    expect(() => isTimeOutOfBounds({ time: futureDate })).not.toThrow();
  });

  it("throws BookingDateInPastError for a past date", () => {
    const pastDate = dayjs().subtract(1, "day");
    expect(() => isTimeOutOfBounds({ time: pastDate })).toThrow(BookingDateInPastError);
  });

  it("returns false when date is after minimum booking notice", () => {
    const futureDate = dayjs().add(2, "hours");
    const result = isTimeOutOfBounds({ time: futureDate, minimumBookingNotice: 30 });
    expect(result).toBe(false);
  });

  it("returns true when date is before minimum booking notice", () => {
    const nearFuture = dayjs().add(10, "minutes");
    const result = isTimeOutOfBounds({ time: nearFuture, minimumBookingNotice: 60 });
    expect(result).toBe(true);
  });

  it("returns false when minimumBookingNotice is undefined", () => {
    const futureDate = dayjs().add(5, "minutes");
    const result = isTimeOutOfBounds({ time: futureDate });
    expect(result).toBe(false);
  });

  it("returns false when minimumBookingNotice is 0", () => {
    const futureDate = dayjs().add(1, "minute");
    const result = isTimeOutOfBounds({ time: futureDate, minimumBookingNotice: 0 });
    expect(result).toBe(false);
  });
});

describe("getPastTimeAndMinimumBookingNoticeBoundsStatus", () => {
  it("returns not out of bounds for future time", () => {
    const futureDate = dayjs().add(2, "hours");
    const result = getPastTimeAndMinimumBookingNoticeBoundsStatus({ time: futureDate });
    expect(result).toEqual({ isOutOfBounds: false, reason: null });
  });

  it("returns slotInPast for past time", () => {
    const pastDate = dayjs().subtract(1, "day");
    const result = getPastTimeAndMinimumBookingNoticeBoundsStatus({ time: pastDate });
    expect(result).toEqual({ isOutOfBounds: true, reason: "slotInPast" });
  });

  it("returns minBookNoticeViolation for near-future within notice period", () => {
    const nearFuture = dayjs().add(10, "minutes");
    const result = getPastTimeAndMinimumBookingNoticeBoundsStatus({
      time: nearFuture,
      minimumBookingNotice: 60,
    });
    expect(result).toEqual({ isOutOfBounds: true, reason: "minBookNoticeViolation" });
  });

  it("rethrows non-BookingDateInPastError errors", () => {
    expect(() =>
      getPastTimeAndMinimumBookingNoticeBoundsStatus({
        time: "invalid" as unknown as Date,
        minimumBookingNotice: undefined,
      })
    ).not.toThrow();
  });
});

describe("calculatePeriodLimits", () => {
  it("returns all nulls for UNLIMITED period type", () => {
    const result = calculatePeriodLimits({
      periodType: PeriodType.UNLIMITED,
      periodDays: null,
      periodCountCalendarDays: null,
      periodStartDate: null,
      periodEndDate: null,
      allDatesWithBookabilityStatusInBookerTz: null,
      eventUtcOffset: 0,
      bookerUtcOffset: 0,
    });

    expect(result.endOfRollingPeriodEndDayInBookerTz).toBeNull();
    expect(result.startOfRangeStartDayInEventTz).toBeNull();
    expect(result.endOfRangeEndDayInEventTz).toBeNull();
  });

  it("returns rolling end day for ROLLING period type with calendar days", () => {
    const result = calculatePeriodLimits({
      periodType: PeriodType.ROLLING,
      periodDays: 7,
      periodCountCalendarDays: true,
      periodStartDate: null,
      periodEndDate: null,
      allDatesWithBookabilityStatusInBookerTz: null,
      eventUtcOffset: 0,
      bookerUtcOffset: 0,
    });

    expect(result.endOfRollingPeriodEndDayInBookerTz).not.toBeNull();
    expect(result.startOfRangeStartDayInEventTz).toBeNull();
    expect(result.endOfRangeEndDayInEventTz).toBeNull();
  });

  it("returns rolling end day for ROLLING period type with business days", () => {
    const result = calculatePeriodLimits({
      periodType: PeriodType.ROLLING,
      periodDays: 5,
      periodCountCalendarDays: false,
      periodStartDate: null,
      periodEndDate: null,
      allDatesWithBookabilityStatusInBookerTz: null,
      eventUtcOffset: 0,
      bookerUtcOffset: 0,
    });

    expect(result.endOfRollingPeriodEndDayInBookerTz).not.toBeNull();
  });

  it("returns all nulls for ROLLING_WINDOW with _skipRollingWindowCheck", () => {
    const result = calculatePeriodLimits({
      periodType: PeriodType.ROLLING_WINDOW,
      periodDays: 7,
      periodCountCalendarDays: true,
      periodStartDate: null,
      periodEndDate: null,
      allDatesWithBookabilityStatusInBookerTz: null,
      eventUtcOffset: 0,
      bookerUtcOffset: 0,
      _skipRollingWindowCheck: true,
    });

    expect(result.endOfRollingPeriodEndDayInBookerTz).toBeNull();
    expect(result.startOfRangeStartDayInEventTz).toBeNull();
    expect(result.endOfRangeEndDayInEventTz).toBeNull();
  });

  it("throws when ROLLING_WINDOW is missing allDatesWithBookabilityStatus", () => {
    expect(() =>
      calculatePeriodLimits({
        periodType: PeriodType.ROLLING_WINDOW,
        periodDays: 7,
        periodCountCalendarDays: true,
        periodStartDate: null,
        periodEndDate: null,
        allDatesWithBookabilityStatusInBookerTz: null,
        eventUtcOffset: 0,
        bookerUtcOffset: 0,
      })
    ).toThrow("`allDatesWithBookabilityStatus` is required");
  });

  it("returns RANGE limits with new format dates (UTC midnight)", () => {
    const result = calculatePeriodLimits({
      periodType: PeriodType.RANGE,
      periodDays: null,
      periodCountCalendarDays: null,
      periodStartDate: new Date("2025-06-01T00:00:00.000Z"),
      periodEndDate: new Date("2025-06-30T00:00:00.000Z"),
      allDatesWithBookabilityStatusInBookerTz: null,
      eventUtcOffset: 0,
      bookerUtcOffset: 0,
    });

    expect(result.endOfRollingPeriodEndDayInBookerTz).toBeNull();
    expect(result.startOfRangeStartDayInEventTz).not.toBeNull();
    expect(result.endOfRangeEndDayInEventTz).not.toBeNull();
  });

  it("returns RANGE limits with old format dates (non-midnight UTC)", () => {
    const result = calculatePeriodLimits({
      periodType: PeriodType.RANGE,
      periodDays: null,
      periodCountCalendarDays: null,
      periodStartDate: new Date("2025-06-01T04:00:00.000Z"),
      periodEndDate: new Date("2025-06-30T04:00:00.000Z"),
      allDatesWithBookabilityStatusInBookerTz: null,
      eventUtcOffset: 0,
      bookerUtcOffset: 0,
    });

    expect(result.startOfRangeStartDayInEventTz).not.toBeNull();
    expect(result.endOfRangeEndDayInEventTz).not.toBeNull();
  });

  it("defaults periodDays to 0 when null", () => {
    const result = calculatePeriodLimits({
      periodType: PeriodType.ROLLING,
      periodDays: null,
      periodCountCalendarDays: true,
      periodStartDate: null,
      periodEndDate: null,
      allDatesWithBookabilityStatusInBookerTz: null,
      eventUtcOffset: 0,
      bookerUtcOffset: 0,
    });

    expect(result.endOfRollingPeriodEndDayInBookerTz).not.toBeNull();
  });
});

describe("getRollingWindowEndDate", () => {
  it("returns end of day when all dates are bookable", () => {
    const startDate = dayjs.utc("2025-06-01");
    const allDates: Record<string, { isBookable: boolean }> = {};
    for (let i = 0; i < 10; i++) {
      allDates[startDate.add(i, "day").format("YYYY-MM-DD")] = { isBookable: true };
    }

    const result = getRollingWindowEndDate({
      startDateInBookerTz: startDate,
      daysNeeded: 5,
      allDatesWithBookabilityStatusInBookerTz: allDates,
      countNonBusinessDays: true,
    });

    expect(result).toBeDefined();
    // Should be 5th bookable day
    expect(result.format("YYYY-MM-DD")).toBe("2025-06-05");
  });

  it("skips non-bookable days when counting", () => {
    const startDate = dayjs.utc("2025-06-01");
    const allDates: Record<string, { isBookable: boolean }> = {
      "2025-06-01": { isBookable: true },
      "2025-06-02": { isBookable: false },
      "2025-06-03": { isBookable: true },
      "2025-06-04": { isBookable: false },
      "2025-06-05": { isBookable: true },
    };

    const result = getRollingWindowEndDate({
      startDateInBookerTz: startDate,
      daysNeeded: 3,
      allDatesWithBookabilityStatusInBookerTz: allDates,
      countNonBusinessDays: true,
    });

    expect(result.format("YYYY-MM-DD")).toBe("2025-06-05");
  });

  it("falls back when not enough bookable days found (max days limit)", () => {
    const startDate = dayjs.utc("2025-06-01");

    const result = getRollingWindowEndDate({
      startDateInBookerTz: startDate,
      daysNeeded: 999,
      allDatesWithBookabilityStatusInBookerTz: {},
      countNonBusinessDays: true,
    });

    expect(result).toBeDefined();
  });
});

describe("isTimeViolatingFutureLimit", () => {
  it("returns false when all limits are null", () => {
    const result = isTimeViolatingFutureLimit({
      time: new Date("2025-06-15T10:00:00Z"),
      periodLimits: {
        endOfRollingPeriodEndDayInBookerTz: null,
        startOfRangeStartDayInEventTz: null,
        endOfRangeEndDayInEventTz: null,
      },
    });

    expect(result).toBe(false);
  });

  it("returns true when time is after rolling period end", () => {
    const result = isTimeViolatingFutureLimit({
      time: new Date("2025-07-01T10:00:00Z"),
      periodLimits: {
        endOfRollingPeriodEndDayInBookerTz: dayjs("2025-06-15T23:59:59Z"),
        startOfRangeStartDayInEventTz: null,
        endOfRangeEndDayInEventTz: null,
      },
    });

    expect(result).toBe(true);
  });

  it("returns false when time is within rolling period", () => {
    const result = isTimeViolatingFutureLimit({
      time: new Date("2025-06-10T10:00:00Z"),
      periodLimits: {
        endOfRollingPeriodEndDayInBookerTz: dayjs("2025-06-15T23:59:59Z"),
        startOfRangeStartDayInEventTz: null,
        endOfRangeEndDayInEventTz: null,
      },
    });

    expect(result).toBe(false);
  });

  it("returns true when time is before range start", () => {
    const result = isTimeViolatingFutureLimit({
      time: new Date("2025-05-01T10:00:00Z"),
      periodLimits: {
        endOfRollingPeriodEndDayInBookerTz: null,
        startOfRangeStartDayInEventTz: dayjs("2025-06-01T00:00:00Z"),
        endOfRangeEndDayInEventTz: dayjs("2025-06-30T23:59:59Z"),
      },
    });

    expect(result).toBe(true);
  });

  it("returns true when time is after range end", () => {
    const result = isTimeViolatingFutureLimit({
      time: new Date("2025-07-15T10:00:00Z"),
      periodLimits: {
        endOfRollingPeriodEndDayInBookerTz: null,
        startOfRangeStartDayInEventTz: dayjs("2025-06-01T00:00:00Z"),
        endOfRangeEndDayInEventTz: dayjs("2025-06-30T23:59:59Z"),
      },
    });

    expect(result).toBe(true);
  });

  it("returns false when time is within range", () => {
    const result = isTimeViolatingFutureLimit({
      time: new Date("2025-06-15T10:00:00Z"),
      periodLimits: {
        endOfRollingPeriodEndDayInBookerTz: null,
        startOfRangeStartDayInEventTz: dayjs("2025-06-01T00:00:00Z"),
        endOfRangeEndDayInEventTz: dayjs("2025-06-30T23:59:59Z"),
      },
    });

    expect(result).toBe(false);
  });
});
