import { describe, it, expect, vi, beforeEach } from "vitest";

import { HttpError } from "@calcom/lib/http-error";

import { validateRescheduleRestrictions } from "./validateRescheduleRestrictions";

vi.mock("./getSeatedBooking", () => ({
  getSeatedBooking: vi.fn(),
}));

vi.mock("./originalRescheduledBookingUtils", () => ({
  getOriginalRescheduledBooking: vi.fn(),
}));

vi.mock("../reschedule/isWithinMinimumRescheduleNotice", () => ({
  isWithinMinimumRescheduleNotice: vi.fn(),
}));

import { getSeatedBooking } from "./getSeatedBooking";
import { getOriginalRescheduledBooking } from "./originalRescheduledBookingUtils";
import { isWithinMinimumRescheduleNotice } from "../reschedule/isWithinMinimumRescheduleNotice";

const mockedGetSeatedBooking = vi.mocked(getSeatedBooking);
const mockedGetOriginalRescheduledBooking = vi.mocked(getOriginalRescheduledBooking);
const mockedIsWithinMinimumRescheduleNotice = vi.mocked(isWithinMinimumRescheduleNotice);

describe("validateRescheduleRestrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return early when rescheduleUid is null", async () => {
    await validateRescheduleRestrictions({
      rescheduleUid: null,
      userId: 1,
      eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
    });

    expect(mockedGetSeatedBooking).not.toHaveBeenCalled();
    expect(mockedGetOriginalRescheduledBooking).not.toHaveBeenCalled();
  });

  it("should return early when eventType is null", async () => {
    await validateRescheduleRestrictions({
      rescheduleUid: "some-uid",
      userId: 1,
      eventType: null,
    });

    expect(mockedGetSeatedBooking).not.toHaveBeenCalled();
  });

  it("should throw HttpError 403 when non-organizer reschedules within minimum notice", async () => {
    mockedGetSeatedBooking.mockResolvedValue(null);
    mockedGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 100,
      startTime: new Date("2026-02-10T10:00:00Z"),
      eventType: { minimumRescheduleNotice: 60 },
    } as Awaited<ReturnType<typeof getOriginalRescheduledBooking>>);
    mockedIsWithinMinimumRescheduleNotice.mockReturnValue(true);

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 200,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).rejects.toThrow(HttpError);

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 200,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("should not throw when organizer reschedules within minimum notice", async () => {
    mockedGetSeatedBooking.mockResolvedValue(null);
    mockedGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 100,
      startTime: new Date("2026-02-10T10:00:00Z"),
      eventType: { minimumRescheduleNotice: 60 },
    } as Awaited<ReturnType<typeof getOriginalRescheduledBooking>>);
    mockedIsWithinMinimumRescheduleNotice.mockReturnValue(true);

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 100,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();
  });

  it("should not throw when outside minimum reschedule notice", async () => {
    mockedGetSeatedBooking.mockResolvedValue(null);
    mockedGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 100,
      startTime: new Date("2026-02-15T10:00:00Z"),
      eventType: { minimumRescheduleNotice: 60 },
    } as Awaited<ReturnType<typeof getOriginalRescheduledBooking>>);
    mockedIsWithinMinimumRescheduleNotice.mockReturnValue(false);

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 200,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();
  });

  it("should use booking seat uid when rescheduleUid matches a seated booking", async () => {
    mockedGetSeatedBooking.mockResolvedValue({
      booking: { uid: "actual-booking-uid" },
      attendee: {},
    } as Awaited<ReturnType<typeof getSeatedBooking>>);
    mockedGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 100,
      startTime: new Date("2026-02-15T10:00:00Z"),
      eventType: { minimumRescheduleNotice: null },
    } as Awaited<ReturnType<typeof getOriginalRescheduledBooking>>);
    mockedIsWithinMinimumRescheduleNotice.mockReturnValue(false);

    await validateRescheduleRestrictions({
      rescheduleUid: "seat-uid",
      userId: 200,
      eventType: { seatsPerTimeSlot: 5, minimumRescheduleNotice: null },
    });

    expect(mockedGetOriginalRescheduledBooking).toHaveBeenCalledWith("actual-booking-uid", true);
  });

  it("should silently handle non-HttpError errors from getOriginalRescheduledBooking", async () => {
    mockedGetSeatedBooking.mockResolvedValue(null);
    mockedGetOriginalRescheduledBooking.mockRejectedValue(new Error("Booking not found"));

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "nonexistent-uid",
        userId: 200,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();
  });
});
