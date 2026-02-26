/**
 * Unit tests for validateRescheduleRestrictions.
 *
 * Covers:
 * - No rescheduleUid or no eventType → no throw
 * - Organizer bypass: organizer can reschedule within minimum notice
 * - Non-organizer within minimum notice → 403
 * - Non-organizer outside minimum notice → no throw
 * - Seated reschedule UID: getSeatedBooking returns seat, actualRescheduleUid from booking.uid
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpError } from "@calcom/lib/http-error";
import { validateRescheduleRestrictions } from "../service/RegularBookingService";

// Use var so Vitest's vi.mock hoisting doesn't hit TDZ
// eslint-disable-next-line no-var
var mockGetSeatedBooking: ReturnType<typeof vi.fn>;
// eslint-disable-next-line no-var
var mockGetOriginalRescheduledBooking: ReturnType<typeof vi.fn>;

vi.mock("../handleNewBooking/getSeatedBooking", () => {
  mockGetSeatedBooking = vi.fn();
  return {
    getSeatedBooking: mockGetSeatedBooking,
  };
});

vi.mock("../handleNewBooking/originalRescheduledBookingUtils", () => {
  mockGetOriginalRescheduledBooking = vi.fn();
  return {
    getOriginalRescheduledBooking: mockGetOriginalRescheduledBooking,
  };
});

describe("validateRescheduleRestrictions", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T13:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when rescheduleUid is null", async () => {
    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: null,
        userId: 1,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();
    expect(mockGetSeatedBooking).not.toHaveBeenCalled();
    expect(mockGetOriginalRescheduledBooking).not.toHaveBeenCalled();
  });

  it("does nothing when eventType is null", async () => {
    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "uid-1",
        userId: 1,
        eventType: null,
      })
    ).resolves.toBeUndefined();
    expect(mockGetSeatedBooking).not.toHaveBeenCalled();
    expect(mockGetOriginalRescheduledBooking).not.toHaveBeenCalled();
  });

  it("does not throw when user is organizer (organizer bypass)", async () => {
    const organizerUserId = 42;
    mockGetSeatedBooking.mockResolvedValue(null);
    mockGetOriginalRescheduledBooking.mockResolvedValue({
      userId: organizerUserId,
      startTime: new Date("2025-06-01T14:00:00Z"),
      eventType: { minimumRescheduleNotice: 60 },
    });

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: organizerUserId,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();

    expect(mockGetOriginalRescheduledBooking).toHaveBeenCalledWith("booking-uid", false);
  });

  it("throws 403 when non-organizer reschedules within minimum notice", async () => {
    mockGetSeatedBooking.mockResolvedValue(null);
    mockGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 10,
      startTime: new Date("2025-06-01T13:30:00Z"),
      eventType: { minimumRescheduleNotice: 60 },
    });

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 99,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).rejects.toMatchObject(
      new HttpError({
        statusCode: 403,
        message: "Rescheduling is not allowed within the minimum notice period before the event",
      })
    );

    expect(mockGetOriginalRescheduledBooking).toHaveBeenCalledWith("booking-uid", false);
  });

  it("does not throw when non-organizer reschedules outside minimum notice", async () => {
    mockGetSeatedBooking.mockResolvedValue(null);
    mockGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 10,
      startTime: new Date("2025-06-01T15:00:00Z"),
      eventType: { minimumRescheduleNotice: 60 },
    });

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 99,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();
  });

  it("uses actualRescheduleUid from seated booking when getSeatedBooking returns a seat", async () => {
    mockGetSeatedBooking.mockResolvedValue({
      booking: { uid: "actual-booking-uid" },
    });
    mockGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 10,
      startTime: new Date("2025-06-01T15:00:00Z"),
      eventType: { minimumRescheduleNotice: 60 },
    });

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "seat-reference-uid",
        userId: 99,
        eventType: { seatsPerTimeSlot: 5, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();

    expect(mockGetOriginalRescheduledBooking).toHaveBeenCalledWith("actual-booking-uid", true);
  });

  it("does not throw when minimumRescheduleNotice is null", async () => {
    mockGetSeatedBooking.mockResolvedValue(null);
    mockGetOriginalRescheduledBooking.mockResolvedValue({
      userId: 10,
      startTime: new Date("2025-06-01T14:00:00Z"),
      eventType: { minimumRescheduleNotice: null },
    });

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 99,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: null },
      })
    ).resolves.toBeUndefined();
  });

  it("does not rethrow non-HttpError (e.g. booking not found)", async () => {
    mockGetSeatedBooking.mockResolvedValue(null);
    mockGetOriginalRescheduledBooking.mockRejectedValue(new Error("Could not find original booking"));

    await expect(
      validateRescheduleRestrictions({
        rescheduleUid: "booking-uid",
        userId: 99,
        eventType: { seatsPerTimeSlot: null, minimumRescheduleNotice: 60 },
      })
    ).resolves.toBeUndefined();
  });
});
