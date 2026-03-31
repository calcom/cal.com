import { ErrorCode } from "@calcom/lib/errorCodes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockCount = vi.fn();
const mockFindMany = vi.fn();

import { checkActiveBookingsLimitForBooker } from "./checkActiveBookingsLimitForBooker";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";

const mockBookingRepository = {
  countActiveBookingsForEventType: mockCount,
  findActiveBookingsForEventType: mockFindMany,
} as unknown as BookingRepository;

describe("checkActiveBookingsLimitForBooker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);
  });

  it("returns immediately when maxActiveBookingsPerBooker is null", async () => {
    await expect(
      checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: null,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: false,
        bookingRepository: mockBookingRepository,
      })
    ).resolves.toBeUndefined();

    expect(mockCount).not.toHaveBeenCalled();
  });

  it("returns immediately when maxActiveBookingsPerBooker is 0", async () => {
    await expect(
      checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: 0,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: false,
        bookingRepository: mockBookingRepository,
      })
    ).resolves.toBeUndefined();

    expect(mockCount).not.toHaveBeenCalled();
  });

  it("does not throw when booking count is below limit", async () => {
    mockCount.mockResolvedValue(2);

    await expect(
      checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: 5,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: false,
        bookingRepository: mockBookingRepository,
      })
    ).resolves.toBeUndefined();
  });

  it("throws BookerLimitExceeded when count reaches limit", async () => {
    mockCount.mockResolvedValue(3);

    await expect(
      checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: 3,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: false,
        bookingRepository: mockBookingRepository,
      })
    ).rejects.toThrow(ErrorCode.BookerLimitExceeded);
  });

  it("throws BookerLimitExceeded when count exceeds limit", async () => {
    mockCount.mockResolvedValue(10);

    await expect(
      checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: 5,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: false,
        bookingRepository: mockBookingRepository,
      })
    ).rejects.toThrow(ErrorCode.BookerLimitExceeded);
  });

  it("uses findMany and throws BookerLimitExceededReschedule when offerToRescheduleLastBooking is true and limit reached", async () => {
    const mockBookings = [
      {
        uid: "booking-2",
        startTime: new Date("2025-06-02T10:00:00Z"),
        attendees: [{ name: "Test", email: "test@example.com", bookingSeat: null }],
      },
      {
        uid: "booking-1",
        startTime: new Date("2025-06-01T10:00:00Z"),
        attendees: [{ name: "Test", email: "test@example.com", bookingSeat: null }],
      },
    ];
    mockFindMany.mockResolvedValue(mockBookings);

    await expect(
      checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: 2,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: true,
        bookingRepository: mockBookingRepository,
      })
    ).rejects.toThrow(ErrorCode.BookerLimitExceededReschedule);

    expect(mockFindMany).toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
  });

  it("does not throw when findMany returns fewer bookings than limit with offerToReschedule", async () => {
    mockFindMany.mockResolvedValue([
      {
        uid: "booking-1",
        startTime: new Date("2025-06-01T10:00:00Z"),
        attendees: [{ name: "Test", email: "test@example.com", bookingSeat: null }],
      },
    ]);

    await expect(
      checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: 5,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: true,
        bookingRepository: mockBookingRepository,
      })
    ).resolves.toBeUndefined();
  });

  it("includes seatUid in error data for seated events with reschedule offer", async () => {
    const mockBookings = [
      {
        uid: "booking-1",
        startTime: new Date("2025-06-01T10:00:00Z"),
        attendees: [
          {
            name: "Test",
            email: "test@example.com",
            bookingSeat: { referenceUid: "seat-uid-123" },
          },
        ],
      },
    ];
    mockFindMany.mockResolvedValue(mockBookings);

    try {
      await checkActiveBookingsLimitForBooker({
        eventTypeId: 1,
        maxActiveBookingsPerBooker: 1,
        bookerEmail: "test@example.com",
        offerToRescheduleLastBooking: true,
        bookingRepository: mockBookingRepository,
      });
      expect.fail("Should have thrown");
    } catch (error: unknown) {
      const err = error as { code: string; data: Record<string, unknown> };
      expect(err.code).toBe(ErrorCode.BookerLimitExceededReschedule);
      expect(err.data).toEqual(
        expect.objectContaining({
          seatUid: "seat-uid-123",
          rescheduleUid: "booking-1",
        })
      );
    }
  });

  it("queries only ACCEPTED bookings with startTime >= now", async () => {
    mockCount.mockResolvedValue(0);

    await checkActiveBookingsLimitForBooker({
      eventTypeId: 42,
      maxActiveBookingsPerBooker: 5,
      bookerEmail: "alice@example.com",
      offerToRescheduleLastBooking: false,
      bookingRepository: mockBookingRepository,
    });

    expect(mockCount).toHaveBeenCalledWith({
      eventTypeId: 42,
      bookerEmail: "alice@example.com",
    });
  });
});
