import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { PeriodType } from "@calcom/prisma/enums";

import type { DateTimeRangeFailure, DateTimeRangeSuccess } from "./transformDateTimeRange";
import { transformDateTimeRange } from "./transformDateTimeRange";

function assertSuccess(
  result: DateTimeRangeSuccess | DateTimeRangeFailure
): asserts result is DateTimeRangeSuccess {
  if (!result.success) {
    throw new Error(`Expected success=true but got failure: ${result.message}`);
  }
}

// Mocks
vi.mock("@calcom/dayjs", async () => {
  const actual = await vi.importActual<typeof import("@calcom/dayjs")>("@calcom/dayjs");

  return {
    ...actual,
    getUTCOffsetByTimezone: (tz: string) => {
      if (tz === "Etc/GMT") return 0;
      if (tz === "America/New_York") return -5 * 60;
      if (tz === "Europe/Berlin") return 1 * 60;
      return 0;
    },
  };
});

vi.mock("./isOutOfBounds", () => ({
  calculatePeriodLimits: () => ({
    endOfRollingPeriodEndDayInBookerTz: dayjs().add(7, "days"),
    startOfRangeStartDayInEventTz: dayjs().subtract(1, "day"),
    endOfRangeEndDayInEventTz: dayjs().add(30, "days"),
  }),
}));

describe("transformDateTimeRange", () => {
  const baseEventType = {
    periodType: PeriodType.ROLLING_WINDOW,
    periodDays: 7,
    periodCountCalendarDays: null,
    periodStartDate: null,
    periodEndDate: null,
    minimumBookingNotice: 15,
    schedule: {
      timeZone: "Europe/Berlin",
    },
  };

  const timeZone = "Europe/Berlin";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-26T12:00:00Z")); // Mock system time
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should succeed and return adjusted start and end times", () => {
    const startInput = dayjs().add(1, "day").toISOString();
    const endInput = dayjs().add(2, "day").toISOString();

    const result = transformDateTimeRange(startInput, endInput, { eventType: baseEventType, timeZone });

    expect(result.success).toBe(true);
    assertSuccess(result);
    expect(result.start.isAfter(dayjs())).toBe(true);
    expect(result.end.isAfter(result.start)).toBe(true);
  });

  it("should adjust endTime if it exceeds endOfRollingPeriodEndDayInBookerTz", () => {
    const startInput = dayjs().add(1, "day").toISOString();
    const endInput = dayjs().add(10, "days").toISOString(); // intentionally beyond mocked 7 days limit

    const result = transformDateTimeRange(startInput, endInput, { eventType: baseEventType, timeZone });

    expect(result.success).toBe(true);
    const expectedEndLimit = dayjs().add(7, "days");
    assertSuccess(result);
    expect(result.end.isSame(expectedEndLimit, "minute")).toBe(true);
  });

  it("should adjust startTime if endTime is before startOfRangeStartDayInEventTz", () => {
    const startInput = dayjs().subtract(5, "days").toISOString();
    const endInput = dayjs().subtract(2, "days").toISOString();

    const result = transformDateTimeRange(startInput, endInput, { eventType: baseEventType, timeZone });

    expect(result.success).toBe(true);
    const expectedStartLimit = dayjs().subtract(1, "day");
    assertSuccess(result);
    expect(result.start.isSame(expectedStartLimit, "minute")).toBe(true);
  });

  it("should respect Etc/GMT timezone correctly", () => {
    const startInput = dayjs().add(2, "days").toISOString();
    const endInput = dayjs().add(3, "days").toISOString();
    const gmtEventType = {
      ...baseEventType,
      schedule: { timeZone: "Etc/GMT" },
    };

    const result = transformDateTimeRange(startInput, endInput, {
      eventType: gmtEventType,
      timeZone: "Etc/GMT",
    });

    expect(result.success).toBe(true);
    assertSuccess(result);
    expect(result.start.isAfter(dayjs())).toBe(true);
    expect(result.end.isAfter(result.start)).toBe(true);
  });

  it("should correctly apply minimum booking notice", () => {
    const now = dayjs();
    const startInput = now.toISOString(); // booking for "now" without waiting

    const result = transformDateTimeRange(startInput, startInput, { eventType: baseEventType, timeZone });

    // It should have pushed start time at least 15 min forward
    const minStartTime = now.add(15, "minutes");
    assertSuccess(result);
    expect(result.start.isAfter(minStartTime.subtract(1, "minute"))).toBe(true);
  });
});
