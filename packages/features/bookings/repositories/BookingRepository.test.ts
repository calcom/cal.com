import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockPrismaClient: {
    $queryRaw: ReturnType<typeof vi.fn>;
    booking: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {
      $queryRaw: vi.fn(),
      booking: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
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

  describe("findByUidIncludeAttendeeEmails", () => {
    it("should query booking by uid with attendee emails", async () => {
      const mockBooking = {
        id: 1,
        uid: "test-uid",
        attendees: [{ email: "guest@example.com" }],
      };
      mockPrismaClient.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await repository.findByUidIncludeAttendeeEmails({ uid: "test-uid" });

      expect(result).toEqual(mockBooking);
      expect(mockPrismaClient.booking.findUnique).toHaveBeenCalledWith({
        where: { uid: "test-uid" },
        select: {
          id: true,
          uid: true,
          attendees: { select: { email: true } },
        },
      });
    });

    it("should return null when booking does not exist", async () => {
      mockPrismaClient.booking.findUnique.mockResolvedValue(null);

      const result = await repository.findByUidIncludeAttendeeEmails({ uid: "nonexistent" });

      expect(result).toBeNull();
    });
  });

  describe("findByUserIdsAndDateRange", () => {
    const dateFrom = new Date("2026-04-01T00:00:00Z");
    const dateTo = new Date("2026-04-30T23:59:59Z");

    it("should return empty array when both userIds and userEmails are empty", async () => {
      const result = await repository.findByUserIdsAndDateRange({
        userIds: [],
        userEmails: [],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual([]);
      expect(mockPrismaClient.booking.findMany).not.toHaveBeenCalled();
    });

    it("should query bookings by userId when userIds are provided", async () => {
      const mockBookings = [
        {
          uid: "booking-1",
          startTime: new Date("2026-04-10T09:00:00Z"),
          endTime: new Date("2026-04-10T10:00:00Z"),
          title: "Meeting",
          userId: 10,
          status: BookingStatus.ACCEPTED,
        },
      ];
      mockPrismaClient.booking.findMany.mockResolvedValue(mockBookings);

      const result = await repository.findByUserIdsAndDateRange({
        userIds: [10],
        userEmails: [],
        dateFrom,
        dateTo,
      });

      expect(result).toEqual(mockBookings);
      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
            AND: [{ startTime: { lt: dateTo } }, { endTime: { gt: dateFrom } }],
          }),
        })
      );
    });

    it("should query bookings by email when userEmails are provided", async () => {
      mockPrismaClient.booking.findMany.mockResolvedValue([]);

      await repository.findByUserIdsAndDateRange({
        userIds: [],
        userEmails: ["guest@example.com"],
        dateFrom,
        dateTo,
      });

      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                attendees: {
                  some: { email: { in: ["guest@example.com"], mode: "insensitive" } },
                },
              },
            ]),
          }),
        })
      );
    });

    it("should combine userId and email conditions in OR clause", async () => {
      mockPrismaClient.booking.findMany.mockResolvedValue([]);

      await repository.findByUserIdsAndDateRange({
        userIds: [10, 20],
        userEmails: ["guest@example.com"],
        dateFrom,
        dateTo,
      });

      const callArgs = mockPrismaClient.booking.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toHaveLength(2);
      expect(callArgs.where.OR).toEqual(
        expect.arrayContaining([
          { userId: { in: [10, 20] } },
          {
            attendees: {
              some: { email: { in: ["guest@example.com"], mode: "insensitive" } },
            },
          },
        ])
      );
    });

    it("should select the correct fields", async () => {
      mockPrismaClient.booking.findMany.mockResolvedValue([]);

      await repository.findByUserIdsAndDateRange({
        userIds: [10],
        userEmails: [],
        dateFrom,
        dateTo,
      });

      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            uid: true,
            startTime: true,
            endTime: true,
            title: true,
            userId: true,
            status: true,
          },
        })
      );
    });

    it("should include excludeUid in query when provided", async () => {
      const repo = new BookingRepository(mockPrismaClient as unknown as PrismaClient);
      await repo.findByUserIdsAndDateRange({
        userIds: [1],
        userEmails: [],
        dateFrom,
        dateTo,
        excludeUid: "booking-to-exclude",
      });

      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            uid: { not: "booking-to-exclude" },
          }),
        })
      );
    });
  });
});
