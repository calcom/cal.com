import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockPrismaClient: {
    $queryRaw: ReturnType<typeof vi.fn>;
    booking: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {
      $queryRaw: vi.fn(),
      booking: {
        findUnique: vi.fn(),
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
  });

  describe("findLatestBookingInRescheduleChain", () => {
    const mockBooking = { uid: "booking-3", eventType: { id: 1 } };

    it("should return null when CTE returns the same uid as input", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ uid: "booking-1" }]);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toBeNull();
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.booking.findUnique).not.toHaveBeenCalled();
    });

    it("should return null when CTE returns empty result", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toBeNull();
      expect(mockPrismaClient.booking.findUnique).not.toHaveBeenCalled();
    });

    it("should fetch the latest booking when CTE resolves a different uid", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ uid: "booking-3" }]);
      mockPrismaClient.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toEqual(mockBooking);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.booking.findUnique).toHaveBeenCalledWith({
        where: { uid: "booking-3" },
        include: { eventType: true },
      });
    });

    it("should return null when latest booking is not found in DB", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ uid: "booking-3" }]);
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      const result = await repository.findLatestBookingInRescheduleChain({ bookingUid: "booking-1" });

      expect(result).toBeNull();
    });
  });
});
