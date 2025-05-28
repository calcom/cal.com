import { describe, expect, it, vi, beforeEach } from "vitest";

import type { readonlyPrisma } from "@calcom/prisma";

import { InsightsBookingRepository } from "../insights-booking.repository";

const mockTeamFindMany = vi.fn();
const mockMembershipFindMany = vi.fn();
const mockBookingFindMany = vi.fn();
const mockBookingCount = vi.fn();

const mockPrismaClient = {
  team: {
    findMany: mockTeamFindMany,
  },
  membership: {
    findMany: mockMembershipFindMany,
  },
  bookingTimeStatusDenormalized: {
    findMany: mockBookingFindMany,
    count: mockBookingCount,
  },
} as unknown as typeof readonlyPrisma;

describe("InsightsBookingRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("findMany", () => {
    it("should apply authorization conditions for regular user", async () => {
      const userId = 123;
      const repository = new InsightsBookingRepository(userId, {}, { prismaClient: mockPrismaClient });

      mockBookingFindMany.mockResolvedValue([]);

      await repository.findMany();

      expect(mockBookingFindMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { userId: 123 }, // Authorization condition
            {}, // Empty filter condition
            {}, // Empty options.where
          ],
        },
      });
    });

    it("should apply eventTypeId filter", async () => {
      const userId = 123;
      const repository = new InsightsBookingRepository(
        userId,
        { eventTypeId: 456 },
        { prismaClient: mockPrismaClient }
      );

      mockBookingFindMany.mockResolvedValue([]);

      await repository.findMany();

      expect(mockBookingFindMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { userId: 123 }, // Authorization condition
            { OR: [{ eventTypeId: 456 }, { eventParentId: 456 }] }, // Filter condition
            {}, // Empty options.where
          ],
        },
      });
    });

    it("should apply memberUserId filter", async () => {
      const userId = 123;
      const repository = new InsightsBookingRepository(
        userId,
        { memberUserId: 789 },
        { prismaClient: mockPrismaClient }
      );

      mockBookingFindMany.mockResolvedValue([]);

      await repository.findMany();

      expect(mockBookingFindMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { userId: 123 }, // Authorization condition
            { userId: 789 }, // Filter condition
            {}, // Empty options.where
          ],
        },
      });
    });

    it("should apply additional where conditions from options", async () => {
      const userId = 123;
      const repository = new InsightsBookingRepository(userId, {}, { prismaClient: mockPrismaClient });

      mockBookingFindMany.mockResolvedValue([]);

      await repository.findMany({
        where: { status: "ACCEPTED" },
      });

      expect(mockBookingFindMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { userId: 123 }, // Authorization condition
            {}, // Empty filter condition
            { status: "ACCEPTED" }, // Options.where
          ],
        },
      });
    });

    it("should apply pagination and sorting options", async () => {
      const userId = 123;
      const repository = new InsightsBookingRepository(userId, {}, { prismaClient: mockPrismaClient });

      mockBookingFindMany.mockResolvedValue([]);

      await repository.findMany({
        take: 10,
        skip: 20,
        orderBy: { createdAt: "desc" },
      });

      expect(mockBookingFindMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { userId: 123 }, // Authorization condition
            {}, // Empty filter condition
            {}, // Empty options.where
          ],
        },
        take: 10,
        skip: 20,
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("count", () => {
    it("should apply the same conditions as findMany", async () => {
      const userId = 123;
      const repository = new InsightsBookingRepository(
        userId,
        { eventTypeId: 456 },
        { prismaClient: mockPrismaClient }
      );

      mockBookingCount.mockResolvedValue(0);

      await repository.count();

      expect(mockBookingCount).toHaveBeenCalledWith({
        where: {
          AND: [
            { userId: 123 }, // Authorization condition
            { OR: [{ eventTypeId: 456 }, { eventParentId: 456 }] }, // Filter condition
            {}, // Empty options.where
          ],
        },
      });
    });
  });
});
