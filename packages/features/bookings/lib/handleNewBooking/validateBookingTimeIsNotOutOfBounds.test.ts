import { PeriodType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/dayjs", () => ({
  getUTCOffsetByTimezone: vi.fn(),
}));

vi.mock("@calcom/lib/isOutOfBounds", () => ({
  default: vi.fn().mockReturnValue(false),
  BookingDateInPastError: class BookingDateInPastError extends Error {},
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

import { getUTCOffsetByTimezone } from "@calcom/lib/dayjs";
import isOutOfBounds from "@calcom/lib/isOutOfBounds";
import { validateBookingTimeIsNotOutOfBounds } from "./validateBookingTimeIsNotOutOfBounds";

const mockLogger = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as Parameters<typeof validateBookingTimeIsNotOutOfBounds>[4];

const baseEventType = {
  id: 1,
  title: "Test Event",
  eventName: "Test",
  periodType: PeriodType.UNLIMITED,
  periodDays: null,
  periodEndDate: null,
  periodStartDate: null,
  periodCountCalendarDays: null,
  minimumBookingNotice: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUTCOffsetByTimezone).mockReturnValue(0);
  vi.mocked(isOutOfBounds).mockReturnValue(false);
});

describe("validateBookingTimeIsNotOutOfBounds", () => {
  it("passes the booking start time to getUTCOffsetByTimezone for booker timezone", async () => {
    const bookingStart = "2024-07-15T16:00:00.000Z";

    await validateBookingTimeIsNotOutOfBounds(
      bookingStart,
      "America/Los_Angeles",
      baseEventType,
      "Asia/Kolkata",
      mockLogger
    );

    expect(getUTCOffsetByTimezone).toHaveBeenCalledWith("America/Los_Angeles", bookingStart);
  });

  it("passes the booking start time to getUTCOffsetByTimezone for event timezone", async () => {
    const bookingStart = "2024-07-15T16:00:00.000Z";

    await validateBookingTimeIsNotOutOfBounds(
      bookingStart,
      "America/Los_Angeles",
      baseEventType,
      "Asia/Kolkata",
      mockLogger
    );

    expect(getUTCOffsetByTimezone).toHaveBeenCalledWith("Asia/Kolkata", bookingStart);
  });

  it("uses the same booking date for both offset calculations", async () => {
    const bookingStart = "2024-07-15T16:00:00.000Z";

    await validateBookingTimeIsNotOutOfBounds(
      bookingStart,
      "America/Los_Angeles",
      baseEventType,
      "Asia/Kolkata",
      mockLogger
    );

    const calls = vi.mocked(getUTCOffsetByTimezone).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe(bookingStart);
    expect(calls[1][1]).toBe(bookingStart);
  });

  it("forwards computed offsets to isOutOfBounds", async () => {
    vi.mocked(getUTCOffsetByTimezone).mockImplementation((tz) => {
      if (tz === "America/Los_Angeles") return -420; // PDT
      if (tz === "Asia/Kolkata") return 330;
      return 0;
    });

    await validateBookingTimeIsNotOutOfBounds(
      "2024-07-15T16:00:00.000Z",
      "America/Los_Angeles",
      baseEventType,
      "Asia/Kolkata",
      mockLogger
    );

    expect(isOutOfBounds).toHaveBeenCalledWith(
      "2024-07-15T16:00:00.000Z",
      expect.objectContaining({
        bookerUtcOffset: -420,
        eventUtcOffset: 330,
      }),
      0
    );
  });

  it("uses 0 for eventUtcOffset when eventTimeZone is null", async () => {
    vi.mocked(getUTCOffsetByTimezone).mockReturnValue(-420);

    await validateBookingTimeIsNotOutOfBounds(
      "2024-07-15T16:00:00.000Z",
      "America/Los_Angeles",
      baseEventType,
      null,
      mockLogger
    );

    expect(isOutOfBounds).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        eventUtcOffset: 0,
      }),
      expect.any(Number)
    );
  });
});
