import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

describe("originalRescheduledBookingUtils - Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Boundary conditions for minimum cancellation notice", () => {
    it("should block reschedule exactly at the minimum notice boundary", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(720, "minutes").toDate(), // Exactly 12 hours (720 minutes) from now
        eventType: {
          minimumCancellationNotice: 720, // 12 hours minimum notice
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      // Should still block at exactly the boundary
      await expect(getOriginalRescheduledBooking("test-uid")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 12 hours of event start",
        })
      );
    });

    it("should allow reschedule one minute after the minimum notice boundary", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(721, "minutes").toDate(), // 12 hours and 1 minute from now
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

    it("should handle events in the past", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().subtract(1, "hour").toDate(), // Event was 1 hour ago
        eventType: {
          minimumCancellationNotice: 120, // 2 hours minimum notice
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      // Should block reschedule for past events
      await expect(getOriginalRescheduledBooking("test-uid")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 2 hours of event start",
        })
      );
    });
  });

  describe("Time formatting edge cases", () => {
    it("should handle singular vs plural time units correctly", async () => {
      // Test 1 hour (singular)
      const mockBooking1Hour = {
        id: 1,
        uid: "test-uid-1h",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 60, // 1 hour
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking1Hour);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid-1h")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 1 hour of event start", // Singular
        })
      );

      // Test 2 hours (plural)
      const mockBooking2Hours = {
        id: 2,
        uid: "test-uid-2h",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(90, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 120, // 2 hours
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking2Hours);

      await expect(getOriginalRescheduledBooking("test-uid-2h")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 2 hours of event start", // Plural
        })
      );

      // Test 1 minute (singular)
      const mockBooking1Minute = {
        id: 3,
        uid: "test-uid-1m",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "seconds").toDate(),
        eventType: {
          minimumCancellationNotice: 1, // 1 minute
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking1Minute);

      await expect(getOriginalRescheduledBooking("test-uid-1m")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 1 minute of event start", // Singular
        })
      );

      // Test 2 minutes (plural)
      const mockBooking2Minutes = {
        id: 4,
        uid: "test-uid-2m",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(1, "minute").toDate(),
        eventType: {
          minimumCancellationNotice: 2, // 2 minutes
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking2Minutes);

      await expect(getOriginalRescheduledBooking("test-uid-2m")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 2 minutes of event start", // Plural
        })
      );
    });

    it("should handle large time periods correctly", async () => {
      // Test 48 hours (2 days)
      const mockBooking48Hours = {
        id: 1,
        uid: "test-uid-48h",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(36, "hours").toDate(), // 36 hours from now
        eventType: {
          minimumCancellationNotice: 2880, // 48 hours in minutes
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking48Hours);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid-48h")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 48 hours of event start",
        })
      );

      // Test 25 hours
      const mockBooking25Hours = {
        id: 2,
        uid: "test-uid-25h",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(24, "hours").toDate(),
        eventType: {
          minimumCancellationNotice: 1500, // 25 hours in minutes
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking25Hours);

      await expect(getOriginalRescheduledBooking("test-uid-25h")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 25 hours of event start",
        })
      );
    });

    it("should handle complex time combinations", async () => {
      // Test 61 minutes (1 hour and 1 minute - both singular)
      const mockBooking61Min = {
        id: 1,
        uid: "test-uid-61m",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 61,
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking61Min);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid-61m")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 1 hour and 1 minute of event start",
        })
      );

      // Test 122 minutes (2 hours and 2 minutes - both plural)
      const mockBooking122Min = {
        id: 2,
        uid: "test-uid-122m",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(60, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 122,
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking122Min);

      await expect(getOriginalRescheduledBooking("test-uid-122m")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 2 hours and 2 minutes of event start",
        })
      );

      // Test 121 minutes (2 hours and 1 minute - mixed)
      const mockBooking121Min = {
        id: 3,
        uid: "test-uid-121m",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(60, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: 121,
        },
        rescheduled: false,
      };

      mockFindOriginalRescheduledBooking.mockResolvedValue(mockBooking121Min);

      await expect(getOriginalRescheduledBooking("test-uid-121m")).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 2 hours and 1 minute of event start",
        })
      );
    });
  });

  describe("Booking status edge cases", () => {
    it("should allow reschedule for cancelled but rescheduled bookings", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.CANCELLED,
        startTime: dayjs().add(24, "hours").toDate(),
        eventType: null,
        rescheduled: true, // This is set to true
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });

    it("should handle bookings with PENDING status", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.PENDING,
        startTime: dayjs().add(24, "hours").toDate(),
        eventType: {
          minimumCancellationNotice: 0,
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });

    it("should handle bookings with REJECTED status appropriately", async () => {
      // REJECTED bookings are filtered out in the query, so this would return null
      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(null);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("rejected-uid")).rejects.toThrow(
        new HttpError({ statusCode: 404, message: "Could not find original booking" })
      );
    });
  });

  describe("EventType configuration edge cases", () => {
    it("should handle bookings with no eventType", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "minutes").toDate(),
        eventType: null, // No event type
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      // Should allow reschedule when no event type is present (defaults to 0 minimum notice)
      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });

    it("should handle bookings with eventType but no minimumCancellationNotice field", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "minutes").toDate(),
        eventType: {
          // No minimumCancellationNotice field
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      // Should allow reschedule when field is undefined (defaults to 0)
      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });

    it("should handle negative minimumCancellationNotice values", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(30, "minutes").toDate(),
        eventType: {
          minimumCancellationNotice: -60, // Negative value (should be treated as 0)
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      // Should allow reschedule when value is negative (treated as no restriction)
      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });
  });

  describe("Seats functionality", () => {
    it("should work correctly with seatsEventType parameter", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(24, "hours").toDate(),
        eventType: {
          minimumCancellationNotice: 0,
          seatsPerTimeSlot: 10,
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      const result = await getOriginalRescheduledBooking("test-uid", true);
      expect(result).toEqual(mockBooking);
      expect(mockFindOriginalRescheduledBooking).toHaveBeenCalledWith("test-uid", true);
    });

    it("should apply minimum notice validation for seat-based events", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(2, "hours").toDate(),
        eventType: {
          minimumCancellationNotice: 180, // 3 hours
          seatsPerTimeSlot: 5,
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid", true)).rejects.toThrow(
        new HttpError({
          statusCode: 403,
          message: "Cannot reschedule within 3 hours of event start",
        })
      );
    });
  });

  describe("Time zone edge cases", () => {
    it("should handle daylight saving time transitions", async () => {
      // Set time to just before DST transition
      const dstTransitionDate = new Date("2024-03-10T02:00:00-05:00"); // Example DST transition
      vi.setSystemTime(dstTransitionDate);

      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs(dstTransitionDate).add(3, "hours").toDate(), // After DST transition
        eventType: {
          minimumCancellationNotice: 180, // 3 hours
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      // The validation should still work correctly even with DST
      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });
  });

  describe("Repository error handling", () => {
    it("should propagate repository errors", async () => {
      const mockFindOriginalRescheduledBooking = vi.fn().mockRejectedValue(
        new Error("Database connection failed")
      );
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      await expect(getOriginalRescheduledBooking("test-uid")).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle null eventType gracefully", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(1, "hour").toDate(),
        eventType: null,
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      const result = await getOriginalRescheduledBooking("test-uid");
      expect(result).toEqual(mockBooking);
    });
  });

  describe("Concurrent reschedule attempts", () => {
    it("should handle multiple rapid calls correctly", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().add(5, "hours").toDate(),
        eventType: {
          minimumCancellationNotice: 360, // 6 hours
        },
        rescheduled: false,
      };

      const mockFindOriginalRescheduledBooking = vi.fn().mockResolvedValue(mockBooking);
      BookingRepository.prototype.findOriginalRescheduledBooking = mockFindOriginalRescheduledBooking;

      // Simulate concurrent calls
      const promises = [
        getOriginalRescheduledBooking("test-uid"),
        getOriginalRescheduledBooking("test-uid"),
        getOriginalRescheduledBooking("test-uid"),
      ];

      const results = await Promise.allSettled(promises);

      // All should fail with the same error
      results.forEach((result) => {
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
          expect(result.reason).toBeInstanceOf(HttpError);
          expect(result.reason.statusCode).toBe(403);
          expect(result.reason.message).toBe("Cannot reschedule within 6 hours of event start");
        }
      });
    });
  });
});