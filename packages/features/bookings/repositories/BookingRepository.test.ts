import { describe, it, expect, beforeEach, vi } from "vitest";

import type { PrismaClient } from "@calcom/prisma";

import { BookingRepository } from "./BookingRepository";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockPrismaClient: {
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {
      $queryRaw: vi.fn(),
    };

    repository = new BookingRepository(mockPrismaClient as unknown as PrismaClient);
  });

  describe("getTotalBookingDurationForUsers", () => {
    it("should return empty map when userIds array is empty", async () => {
      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 1,
        userIds: [],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toEqual(new Map());
      expect(mockPrismaClient.$queryRaw).not.toHaveBeenCalled();
    });

    it("should return map with user durations for single user", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ userId: 1, totalMinutes: 120 }]);

      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 52,
        userIds: [1],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBeInstanceOf(Map);
      expect(result.get(1)).toBe(120);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return map with user durations for multiple users", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { userId: 29, totalMinutes: 60 },
        { userId: 31, totalMinutes: 180 },
      ]);

      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 52,
        userIds: [29, 31],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBeInstanceOf(Map);
      expect(result.get(29)).toBe(60);
      expect(result.get(31)).toBe(180);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 0 for users with no bookings (null totalMinutes)", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ userId: 1, totalMinutes: null }]);

      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 52,
        userIds: [1],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result.get(1)).toBe(0);
    });

    it("should not include user in map if they have no bookings in the period", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ userId: 29, totalMinutes: 60 }]);

      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 52,
        userIds: [29, 31],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result.get(29)).toBe(60);
      expect(result.has(31)).toBe(false);
    });

    it("should exclude reschedule booking when rescheduleUid is provided", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ userId: 1, totalMinutes: 90 }]);

      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 52,
        userIds: [1],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        rescheduleUid: "existing-booking-uid",
      });

      expect(result.get(1)).toBe(90);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should handle empty results from database", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([]);

      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 52,
        userIds: [1, 2, 3],
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it("should handle large number of users efficiently", async () => {
      const userIds = Array.from({ length: 100 }, (_, i) => i + 1);
      const mockResults = userIds.map((userId) => ({
        userId,
        totalMinutes: userId * 10,
      }));
      mockPrismaClient.$queryRaw.mockResolvedValue(mockResults);

      const result = await repository.getTotalBookingDurationForUsers({
        eventId: 52,
        userIds,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result.size).toBe(100);
      expect(result.get(1)).toBe(10);
      expect(result.get(100)).toBe(1000);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
