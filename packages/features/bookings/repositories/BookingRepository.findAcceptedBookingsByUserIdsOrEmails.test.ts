import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Create a minimal mock PrismaClient
const mockFindMany = vi.fn();
const mockPrisma = {
  booking: { findMany: mockFindMany },
} as any;

describe("BookingRepository.findAcceptedBookingsByUserIdsOrEmails", () => {
  let repo: BookingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new BookingRepository(mockPrisma);
  });

  it("returns empty array when both userIds and emails are empty", async () => {
    const result = await repo.findAcceptedBookingsByUserIdsOrEmails({
      userIds: [],
      emails: [],
      startDate: new Date(),
      endDate: new Date(),
    });
    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("queries with ACCEPTED status filter", async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findAcceptedBookingsByUserIdsOrEmails({
      userIds: [1],
      emails: [],
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACCEPTED",
        }),
      })
    );
  });

  it("passes date range correctly", async () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");
    mockFindMany.mockResolvedValue([]);
    await repo.findAcceptedBookingsByUserIdsOrEmails({
      userIds: [1],
      emails: [],
      startDate,
      endDate,
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: { gte: startDate },
          endTime: { lte: endDate },
        }),
      })
    );
  });

  it("excludes booking by uid when excludeUid provided", async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findAcceptedBookingsByUserIdsOrEmails({
      userIds: [1],
      emails: [],
      startDate: new Date(),
      endDate: new Date(),
      excludeUid: "uid-to-exclude",
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          uid: { not: "uid-to-exclude" },
        }),
      })
    );
  });

  it("selects only uid, startTime, and endTime", async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findAcceptedBookingsByUserIdsOrEmails({
      userIds: [1],
      emails: [],
      startDate: new Date(),
      endDate: new Date(),
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { uid: true, startTime: true, endTime: true },
      })
    );
  });
});
