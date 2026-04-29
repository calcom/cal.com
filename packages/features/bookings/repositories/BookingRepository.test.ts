import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockPrismaClient: {
    $queryRaw: ReturnType<typeof vi.fn>;
    booking: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {
      $queryRaw: vi.fn(),
      booking: {
        findFirst: vi.fn(),
      },
    };

    repository = new BookingRepository(mockPrismaClient as unknown as PrismaClient);
  });

  describe("getTotalBookingDuration", () => {
    it("should return total minutes from the database result", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 120 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(120);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when totalMinutes is null", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: null }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(0);
    });

    it("should call query when rescheduleUid is provided", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 90 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        rescheduleUid: "existing-booking-uid",
      });

      expect(result).toBe(90);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return total minutes of unique time slots for seated events", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 60 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        seatsPerTimeSlot: 4,
      });

      expect(result).toBe(60);
    });

    it("should return total minutes of all bookings for non-seated events", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 90 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        seatsPerTimeSlot: 1,
      });

      expect(result).toBe(90);
    });

    it("should treat seatsPerTimeSlot = null as non-seated event", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 30 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        seatsPerTimeSlot: null,
      });

      expect(result).toBe(30);
    });

    it("should handle seated event with rescheduleUid", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 60 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        rescheduleUid: "existing-booking-uid",
        seatsPerTimeSlot: 4,
      });

      expect(result).toBe(60);
    });
  });

  describe("findByTimeSlotAndCheckIfSeatingLimitIsReached", () => {
    it("should return exists: false when no booking exists", async () => {
      mockPrismaClient.booking.findFirst.mockResolvedValue(null);

      const result = await repository.findByTimeSlotAndCheckIfSeatingLimitIsReached({
        eventTypeId: 52,
        startTime: new Date("2026-01-01T10:00:00"),
        endTime: new Date("2026-01-01T11:00:00"),
        seatsPerTimeSlot: 4,
      });

      expect(result).toEqual({
        exists: false,
        isSeatFull: null,
        seatCount: null,
      });
    });

    it("should return slot info when booking exists and seats available", async () => {
      mockPrismaClient.booking.findFirst.mockResolvedValue({
        id: 1,
        _count: {
          seatsReferences: 2,
        },
      });

      const result = await repository.findByTimeSlotAndCheckIfSeatingLimitIsReached({
        eventTypeId: 52,
        startTime: new Date("2026-01-01T10:00:00"),
        endTime: new Date("2026-01-01T11:00:00"),
        seatsPerTimeSlot: 4,
      });

      expect(result).toEqual({
        exists: true,
        isSeatFull: false,
        seatCount: 2,
      });
    });

    it("should return slot info when booking exists and seats are full", async () => {
      mockPrismaClient.booking.findFirst.mockResolvedValue({
        id: 1,
        _count: {
          seatsReferences: 4,
        },
      });

      const result = await repository.findByTimeSlotAndCheckIfSeatingLimitIsReached({
        eventTypeId: 52,
        startTime: new Date("2026-01-01T10:00:00"),
        endTime: new Date("2026-01-01T11:00:00"),
        seatsPerTimeSlot: 4,
      });

      expect(result).toEqual({
        exists: true,
        isSeatFull: true,
        seatCount: 4,
      });
    });
  });
});
