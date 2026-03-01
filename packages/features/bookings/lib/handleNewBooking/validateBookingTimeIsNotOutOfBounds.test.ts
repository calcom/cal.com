import { ErrorCode } from "@calcom/lib/errorCodes";
import type { PeriodType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: (fn: (...args: never[]) => unknown) => fn,
}));

const mockIsOutOfBounds = vi.fn();
vi.mock("@calcom/lib/isOutOfBounds", () => {
  class BookingDateInPastError extends Error {
    constructor(message?: string) {
      super(message || "Booking date is in the past");
      this.name = "BookingDateInPastError";
    }
  }
  return {
    default: (...args: unknown[]) => mockIsOutOfBounds(...args),
    BookingDateInPastError,
  };
});

vi.mock("@calcom/lib/dayjs", () => ({
  getUTCOffsetByTimezone: (tz: string) => {
    if (tz === "America/New_York") return -300;
    if (tz === "Asia/Tokyo") return 540;
    if (tz === "UTC") return 0;
    return 0;
  },
}));

import { validateBookingTimeIsNotOutOfBounds } from "./validateBookingTimeIsNotOutOfBounds";

const mockLogger = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as Parameters<typeof validateBookingTimeIsNotOutOfBounds>[4];

function makeEventType(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Test Event",
    eventName: "test",
    periodType: "UNLIMITED" as PeriodType,
    periodDays: null,
    periodEndDate: null,
    periodStartDate: null,
    periodCountCalendarDays: null,
    minimumBookingNotice: 0,
    ...overrides,
  };
}

describe("validateBookingTimeIsNotOutOfBounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOutOfBounds.mockReturnValue(false);
  });

  it("does not throw when booking is within bounds", async () => {
    await expect(
      validateBookingTimeIsNotOutOfBounds("2025-06-01T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).resolves.toBeUndefined();
  });

  it("throws HttpError with BookingTimeOutOfBounds when isOutOfBounds returns true", async () => {
    mockIsOutOfBounds.mockReturnValue(true);

    await expect(
      validateBookingTimeIsNotOutOfBounds("2025-06-01T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).rejects.toThrow(ErrorCode.BookingTimeOutOfBounds);
  });

  it("passes correct UTC offsets to isOutOfBounds", async () => {
    await validateBookingTimeIsNotOutOfBounds(
      "2025-06-01T10:00:00Z",
      "America/New_York",
      makeEventType(),
      "Asia/Tokyo",
      mockLogger
    );

    expect(mockIsOutOfBounds).toHaveBeenCalledWith(
      "2025-06-01T10:00:00Z",
      expect.objectContaining({
        bookerUtcOffset: -300,
        eventUtcOffset: 540,
      }),
      0
    );
  });

  it("uses 0 for eventUtcOffset when eventTimeZone is null", async () => {
    await validateBookingTimeIsNotOutOfBounds(
      "2025-06-01T10:00:00Z",
      "UTC",
      makeEventType(),
      null,
      mockLogger
    );

    expect(mockIsOutOfBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventUtcOffset: 0 }),
      expect.anything()
    );
  });

  it("uses 0 for eventUtcOffset when eventTimeZone is undefined", async () => {
    await validateBookingTimeIsNotOutOfBounds(
      "2025-06-01T10:00:00Z",
      "UTC",
      makeEventType(),
      undefined,
      mockLogger
    );

    expect(mockIsOutOfBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventUtcOffset: 0 }),
      expect.anything()
    );
  });

  it("passes minimumBookingNotice to isOutOfBounds", async () => {
    await validateBookingTimeIsNotOutOfBounds(
      "2025-06-01T10:00:00Z",
      "UTC",
      makeEventType({ minimumBookingNotice: 120 }),
      "UTC",
      mockLogger
    );

    expect(mockIsOutOfBounds).toHaveBeenCalledWith(expect.anything(), expect.anything(), 120);
  });

  it("passes periodType and period fields to isOutOfBounds", async () => {
    const eventType = makeEventType({
      periodType: "ROLLING",
      periodDays: 30,
      periodCountCalendarDays: true,
    });

    await validateBookingTimeIsNotOutOfBounds("2025-06-01T10:00:00Z", "UTC", eventType, "UTC", mockLogger);

    expect(mockIsOutOfBounds).toHaveBeenCalledWith(
      "2025-06-01T10:00:00Z",
      expect.objectContaining({
        periodType: "ROLLING",
        periodDays: 30,
        periodCountCalendarDays: true,
      }),
      expect.anything()
    );
  });

  it("throws HttpError when BookingDateInPastError is thrown by isOutOfBounds", async () => {
    const { BookingDateInPastError } = await import("@calcom/lib/isOutOfBounds");
    mockIsOutOfBounds.mockImplementation(() => {
      throw new BookingDateInPastError("Booking date is in the past");
    });

    await expect(
      validateBookingTimeIsNotOutOfBounds("2020-01-01T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).rejects.toThrow("Booking date is in the past");
  });

  it("defaults to false when isOutOfBounds throws a generic error", async () => {
    mockIsOutOfBounds.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    await expect(
      validateBookingTimeIsNotOutOfBounds("2025-06-01T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).resolves.toBeUndefined();
  });
});
