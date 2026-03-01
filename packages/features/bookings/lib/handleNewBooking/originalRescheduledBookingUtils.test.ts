import { ErrorCode } from "@calcom/lib/errorCodes";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindOriginalRescheduledBooking = vi.fn();

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => {
  return {
    BookingRepository: class MockBookingRepository {
      findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;
    },
  };
});

vi.mock("@calcom/prisma", () => ({
  default: {},
}));

import { getOriginalRescheduledBooking } from "./originalRescheduledBookingUtils";

describe("getOriginalRescheduledBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the booking when found and not cancelled", async () => {
    const mockBooking = {
      id: 1,
      uid: "booking-uid-123",
      status: BookingStatus.ACCEPTED,
      rescheduled: false,
    };
    mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking);

    const result = await getOriginalRescheduledBooking("booking-uid-123");

    expect(result).toEqual(mockBooking);
    expect(mockFindOriginalRescheduledBooking).toHaveBeenCalledWith("booking-uid-123", undefined);
  });

  it("passes seatsEventType parameter to repository", async () => {
    const mockBooking = {
      id: 1,
      uid: "booking-uid-123",
      status: BookingStatus.ACCEPTED,
      rescheduled: false,
    };
    mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking);

    await getOriginalRescheduledBooking("booking-uid-123", true);

    expect(mockFindOriginalRescheduledBooking).toHaveBeenCalledWith("booking-uid-123", true);
  });

  it("throws 404 HttpError when booking is not found", async () => {
    mockFindOriginalRescheduledBooking.mockResolvedValue(null);

    await expect(getOriginalRescheduledBooking("nonexistent-uid")).rejects.toThrow(
      "Could not find original booking"
    );
  });

  it("throws 400 HttpError when booking is cancelled and not rescheduled", async () => {
    const cancelledBooking = {
      id: 2,
      uid: "cancelled-uid",
      status: BookingStatus.CANCELLED,
      rescheduled: false,
    };
    mockFindOriginalRescheduledBooking.mockResolvedValue(cancelledBooking);

    await expect(getOriginalRescheduledBooking("cancelled-uid")).rejects.toThrow(
      ErrorCode.CancelledBookingsCannotBeRescheduled
    );
  });

  it("returns booking when it is cancelled but was rescheduled", async () => {
    const rescheduledBooking = {
      id: 3,
      uid: "rescheduled-uid",
      status: BookingStatus.CANCELLED,
      rescheduled: true,
    };
    mockFindOriginalRescheduledBooking.mockResolvedValue(rescheduledBooking);

    const result = await getOriginalRescheduledBooking("rescheduled-uid");

    expect(result).toEqual(rescheduledBooking);
  });

  it("returns booking with PENDING status", async () => {
    const pendingBooking = {
      id: 4,
      uid: "pending-uid",
      status: BookingStatus.PENDING,
      rescheduled: false,
    };
    mockFindOriginalRescheduledBooking.mockResolvedValue(pendingBooking);

    const result = await getOriginalRescheduledBooking("pending-uid");

    expect(result).toEqual(pendingBooking);
  });
});
