import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingRepository } from "./BookingRepository";

const mockFindMany = vi.fn();
const mockPrisma = {
  booking: { findMany: mockFindMany },
} as unknown as PrismaClient;

describe("BookingRepository.findAcceptedByUserIdsOrEmails", () => {
  let repo: BookingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new BookingRepository(mockPrisma);
  });

  it("returns empty array when both userIds and emails are empty", async () => {
    const result = await repo.findAcceptedByUserIdsOrEmails({
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
    await repo.findAcceptedByUserIdsOrEmails({
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

  it("uses overlap semantics for date range", async () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");
    mockFindMany.mockResolvedValue([]);
    await repo.findAcceptedByUserIdsOrEmails({
      userIds: [1],
      emails: [],
      startDate,
      endDate,
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: { lte: endDate },
          endTime: { gte: startDate },
        }),
      })
    );
  });

  it("excludes booking by uid when excludeUid provided", async () => {
    mockFindMany.mockResolvedValue([]);
    await repo.findAcceptedByUserIdsOrEmails({
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
    await repo.findAcceptedByUserIdsOrEmails({
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
