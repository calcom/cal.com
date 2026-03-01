import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/isOutOfBounds", () => ({
  default: vi.fn().mockReturnValue(false),
  BookingDateInPastError: class BookingDateInPastError extends Error {
    constructor(message = "Booking date is in the past") {
      super(message);
      this.name = "BookingDateInPastError";
    }
  },
}));

vi.mock("@calcom/lib/dayjs", () => ({
  getUTCOffsetByTimezone: vi.fn().mockReturnValue(0),
}));

vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: vi.fn((fn: (...args: never[]) => unknown) => fn),
}));

import { HttpError } from "@calcom/lib/http-error";
import isOutOfBounds, { BookingDateInPastError } from "@calcom/lib/isOutOfBounds";
import { validateBookingTimeIsNotOutOfBounds } from "./validateBookingTimeIsNotOutOfBounds";

const mockLogger = {
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as never;

const makeEventType = (overrides = {}) => ({
  id: 1,
  title: "Test Event",
  eventName: "test-event",
  periodType: "UNLIMITED",
  periodDays: null,
  periodEndDate: null,
  periodStartDate: null,
  periodCountCalendarDays: null,
  minimumBookingNotice: 0,
  ...overrides,
});

describe("validateBookingTimeIsNotOutOfBounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when time is within bounds", async () => {
    vi.mocked(isOutOfBounds).mockReturnValue(false);

    await expect(
      validateBookingTimeIsNotOutOfBounds("2024-01-15T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).resolves.not.toThrow();
  });

  it("throws HttpError 400 when time is out of bounds", async () => {
    vi.mocked(isOutOfBounds).mockReturnValue(true);

    await expect(
      validateBookingTimeIsNotOutOfBounds("2024-01-15T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).rejects.toThrow(HttpError);
  });

  it("throws HttpError when booking date is in the past", async () => {
    vi.mocked(isOutOfBounds).mockImplementation(() => {
      throw new BookingDateInPastError("Booking date is in the past");
    });

    await expect(
      validateBookingTimeIsNotOutOfBounds("2020-01-01T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).rejects.toThrow(HttpError);
  });

  it("defaults to false when isOutOfBounds throws a non-past-date error", async () => {
    vi.mocked(isOutOfBounds).mockImplementation(() => {
      throw new Error("Unknown error");
    });

    await expect(
      validateBookingTimeIsNotOutOfBounds("2024-01-15T10:00:00Z", "UTC", makeEventType(), "UTC", mockLogger)
    ).resolves.not.toThrow();
  });

  it("passes event timezone offset to isOutOfBounds", async () => {
    vi.mocked(isOutOfBounds).mockReturnValue(false);

    await validateBookingTimeIsNotOutOfBounds(
      "2024-01-15T10:00:00Z",
      "America/New_York",
      makeEventType(),
      "Europe/London",
      mockLogger
    );

    expect(isOutOfBounds).toHaveBeenCalledWith(
      "2024-01-15T10:00:00Z",
      expect.objectContaining({
        periodType: "UNLIMITED",
      }),
      0
    );
  });
});
