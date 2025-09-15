import { describe, expect, it, vi, beforeEach } from "vitest";
import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { BookingStatus } from "@calcom/prisma/enums";
import { getOriginalRescheduledBooking } from "./originalRescheduledBookingUtils";

// Mock the prisma client
vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

// Mock the BookingRepository
vi.mock("@calcom/lib/server/repository/booking");

describe("originalRescheduledBookingUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe("getOriginalRescheduledBooking", () => {
    it("should throw error when booking is within minimum cancellation notice period", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(6, "hours").toDate(), // Booking starts in 6 hours
        eventType: {
          minimumCancellationNotice: 720, // 12 hours minimum notice
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 12 hours of event start",
        })
      );
    });

    it("should allow reschedule when outside minimum cancellation notice period", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(13, "hours").toDate(), // Booking starts in 13 hours
        eventType: {
          minimumCancellationNotice: 720, // 12 hours minimum notice
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });

    it("should allow reschedule when no minimum notice is set", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "minutes").toDate(), // Booking starts in 30 minutes
        eventType: {
          minimumCancellationNotice: 0, // No minimum notice
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });

    it("should format error message correctly for different time periods", async () => {
      // Test 90 minutes (1 hour and 30 minutes)
      const mockBooking90Min = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(60, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 90,
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking90Min);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 1 hour and 30 minutes of event start",
        })
      );

      // Test 60 minutes (1 hour)
      const mockBooking60Min = {
        id: 2,
        uid: "test-uid-2",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 60,
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking60Min);

      await expect(getOriginalRescheduledBooking("test-uid-2")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 1 hour of event start",
        })
      );

      // Test 30 minutes
      const mockBooking30Min = {
        id: 3,
        uid: "test-uid-3",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(15, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 30,
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking30Min);

      await expect(getOriginalRescheduledBooking("test-uid-3")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 30 minutes of event start",
        })
      );
    });

    it("should throw error when booking is not found", async () => {
      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(null);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("non-existent-uid")).rejects.toThrow(
        new HttpError({ statusCode: 404, message: "Could not find original booking" })
      );
    });

    it("should throw error when booking is cancelled and not rescheduled", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.CANCELLED,
        startTime: dayjs().add(24, "hours").toDate(),
        eventType: null,
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid")).rejects.toThrow(
        new HttpError({ statusCode: 400, message: "CANCELLED_BOOKINGS_CANNOT_BE_RESCHEDULED" })
      );
    });
  });
});