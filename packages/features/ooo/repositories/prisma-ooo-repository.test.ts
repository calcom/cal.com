import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaOOORepository } from "./prisma-ooo-repository";

describe("PrismaOOORepository", () => {
  let mockPrisma: {
    outOfOfficeEntry: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    outOfOfficeReason: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let repository: PrismaOOORepository;

  beforeEach(() => {
    mockPrisma = {
      outOfOfficeEntry: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      outOfOfficeReason: {
        findMany: vi.fn(),
      },
    };
    repository = new PrismaOOORepository(mockPrisma as unknown as PrismaClient);
  });

  describe("findByIdForWebhook", () => {
    it("should return OOO entry with all webhook-required fields", async () => {
      const mockEntry = {
        id: 1,
        uuid: "test-uuid-123",
        start: new Date("2024-01-15"),
        end: new Date("2024-01-20"),
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
        notes: "On vacation",
        reasonId: 1,
        reason: { emoji: "🏖️", reason: "Vacation" },
        user: {
          id: 10,
          name: "John Doe",
          username: "johndoe",
          email: "john@example.com",
          timeZone: "America/New_York",
        },
        toUser: {
          id: 20,
          name: "Jane Smith",
          username: "janesmith",
          email: "jane@example.com",
          timeZone: "Europe/London",
        },
      };
      mockPrisma.outOfOfficeEntry.findUnique.mockResolvedValue(mockEntry);

      const result = await repository.findByIdForWebhook(1);

      expect(result).toEqual(mockEntry);
      expect(mockPrisma.outOfOfficeEntry.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          uuid: true,
          start: true,
          end: true,
          createdAt: true,
          updatedAt: true,
          notes: true,
          reasonId: true,
          reason: { select: { emoji: true, reason: true } },
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              timeZone: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              timeZone: true,
            },
          },
        },
      });
    });

    it("should return null when OOO entry does not exist", async () => {
      mockPrisma.outOfOfficeEntry.findUnique.mockResolvedValue(null);

      const result = await repository.findByIdForWebhook(999);

      expect(result).toBeNull();
    });

    it("should return entry without toUser when no redirect is set", async () => {
      const mockEntry = {
        id: 1,
        uuid: "test-uuid-123",
        start: new Date("2024-01-15"),
        end: new Date("2024-01-20"),
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
        notes: null,
        reasonId: 1,
        reason: { emoji: "🤒", reason: "Sick Leave" },
        user: {
          id: 10,
          name: "John Doe",
          username: "johndoe",
          email: "john@example.com",
          timeZone: "America/New_York",
        },
        toUser: null,
      };
      mockPrisma.outOfOfficeEntry.findUnique.mockResolvedValue(mockEntry);

      const result = await repository.findByIdForWebhook(1);

      expect(result).toEqual(mockEntry);
      expect(result?.toUser).toBeNull();
    });
  });

  describe("findManyOOO", () => {
    const startTimeDate = new Date("2024-01-01");
    const endTimeDate = new Date("2024-01-31");
    const allUserIds = [1, 2, 3];

    it("should return OOO entries for multiple users within date range", async () => {
      const mockEntries = [
        {
          id: 1,
          start: new Date("2024-01-10"),
          end: new Date("2024-01-15"),
          notes: "Vacation",
          showNotePublicly: true,
          user: { id: 1, name: "User One" },
          toUser: { id: 2, username: "usertwo", name: "User Two" },
          reason: { id: 1, emoji: "🏖️", reason: "Vacation" },
        },
        {
          id: 2,
          start: new Date("2024-01-20"),
          end: new Date("2024-01-25"),
          notes: "Conference",
          showNotePublicly: false,
          user: { id: 2, name: "User Two" },
          toUser: null,
          reason: { id: 2, emoji: "📅", reason: "Conference" },
        },
      ];
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue(mockEntries);

      const result = await repository.findManyOOO({ startTimeDate, endTimeDate, allUserIds });

      expect(result).toEqual(mockEntries);
      expect(mockPrisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: { in: allUserIds },
          OR: [
            { start: { lte: endTimeDate }, end: { gte: startTimeDate } },
            { start: { lte: endTimeDate }, end: { gte: endTimeDate } },
            { start: { lte: startTimeDate }, end: { lte: endTimeDate } },
          ],
        },
        select: {
          id: true,
          start: true,
          end: true,
          notes: true,
          showNotePublicly: true,
          user: { select: { id: true, name: true } },
          toUser: { select: { id: true, username: true, name: true } },
          reason: { select: { id: true, emoji: true, reason: true } },
        },
      });
    });

    it("should return empty array when no OOO entries exist", async () => {
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue([]);

      const result = await repository.findManyOOO({ startTimeDate, endTimeDate, allUserIds });

      expect(result).toEqual([]);
    });

    it("should handle single user ID", async () => {
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue([]);

      await repository.findManyOOO({ startTimeDate, endTimeDate, allUserIds: [1] });

      expect(mockPrisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { in: [1] },
          }),
        })
      );
    });

    it("should handle empty user IDs array", async () => {
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue([]);

      await repository.findManyOOO({ startTimeDate, endTimeDate, allUserIds: [] });

      expect(mockPrisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { in: [] },
          }),
        })
      );
    });
  });

  describe("findUserOOODays", () => {
    const userId = 1;
    const dateFrom = "2024-01-01";
    const dateTo = "2024-01-31";

    it("should return OOO days for a specific user within date range", async () => {
      const mockEntries = [
        {
          id: 1,
          start: new Date("2024-01-10"),
          end: new Date("2024-01-15"),
          notes: "Annual leave",
          showNotePublicly: true,
          user: { id: 1, name: "Test User" },
          toUser: { id: 2, username: "backup", name: "Backup User" },
          reason: { id: 1, emoji: "🏖️", reason: "Vacation" },
        },
      ];
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue(mockEntries);

      const result = await repository.findUserOOODays({ userId, dateTo, dateFrom });

      expect(result).toEqual(mockEntries);
      expect(mockPrisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [
            { start: { lte: dateTo }, end: { gte: dateFrom } },
            { start: { lte: dateTo }, end: { gte: dateTo } },
            { start: { lte: dateFrom }, end: { lte: dateTo } },
          ],
        },
        select: {
          id: true,
          start: true,
          end: true,
          notes: true,
          showNotePublicly: true,
          user: { select: { id: true, name: true } },
          toUser: { select: { id: true, username: true, name: true } },
          reason: { select: { id: true, emoji: true, reason: true } },
        },
      });
    });

    it("should return empty array when user has no OOO days", async () => {
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue([]);

      const result = await repository.findUserOOODays({ userId, dateTo, dateFrom });

      expect(result).toEqual([]);
    });

    it("should handle multiple OOO entries for same user", async () => {
      const mockEntries = [
        {
          id: 1,
          start: new Date("2024-01-05"),
          end: new Date("2024-01-07"),
          notes: "Short break",
          showNotePublicly: false,
          user: { id: 1, name: "Test User" },
          toUser: null,
          reason: { id: 1, emoji: "🏠", reason: "Personal" },
        },
        {
          id: 2,
          start: new Date("2024-01-20"),
          end: new Date("2024-01-25"),
          notes: "Vacation",
          showNotePublicly: true,
          user: { id: 1, name: "Test User" },
          toUser: { id: 3, username: "colleague", name: "Colleague" },
          reason: { id: 2, emoji: "🏖️", reason: "Vacation" },
        },
      ];
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue(mockEntries);

      const result = await repository.findUserOOODays({ userId, dateTo, dateFrom });

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockEntries);
    });
  });

  describe("findOOOEntriesInInterval", () => {
    const userIds = [1, 2];
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    it("should return OOO entries in interval with minimal fields", async () => {
      const mockEntries = [
        { start: new Date("2024-01-10"), end: new Date("2024-01-15"), userId: 1 },
        { start: new Date("2024-01-20"), end: new Date("2024-01-25"), userId: 2 },
      ];
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue(mockEntries);

      const result = await repository.findOOOEntriesInInterval({ userIds, startDate, endDate });

      expect(result).toEqual(mockEntries);
      expect(mockPrisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: { in: userIds },
          start: { lte: endDate },
          end: { gte: startDate },
        },
        select: {
          start: true,
          end: true,
          userId: true,
        },
      });
    });

    it("should return empty array when no entries exist in interval", async () => {
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue([]);

      const result = await repository.findOOOEntriesInInterval({ userIds, startDate, endDate });

      expect(result).toEqual([]);
    });

    it("should handle single user ID", async () => {
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue([]);

      await repository.findOOOEntriesInInterval({ userIds: [1], startDate, endDate });

      expect(mockPrisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { in: [1] },
          }),
        })
      );
    });

    it("should use simple interval query (start <= endDate AND end >= startDate)", async () => {
      mockPrisma.outOfOfficeEntry.findMany.mockResolvedValue([]);

      await repository.findOOOEntriesInInterval({ userIds, startDate, endDate });

      // Verify the simpler query structure compared to findManyOOO
      expect(mockPrisma.outOfOfficeEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: { in: userIds },
          start: { lte: endDate },
          end: { gte: startDate },
        },
        select: {
          start: true,
          end: true,
          userId: true,
        },
      });
    });
  });

  describe("findEnabledReasons", () => {
    it("should return all enabled out of office reasons", async () => {
      const mockReasons = [
        { id: 1, reason: "Vacation", emoji: "🏖️", enabled: true, userId: null },
        { id: 2, reason: "Sick Leave", emoji: "🤒", enabled: true, userId: null },
      ];
      mockPrisma.outOfOfficeReason.findMany.mockResolvedValue(mockReasons);

      const result = await repository.findEnabledReasons();

      expect(result).toEqual(mockReasons);
      expect(mockPrisma.outOfOfficeReason.findMany).toHaveBeenCalledWith({
        where: {
          enabled: true,
        },
      });
    });

    it("should return empty array when no enabled reasons exist", async () => {
      mockPrisma.outOfOfficeReason.findMany.mockResolvedValue([]);

      const result = await repository.findEnabledReasons();

      expect(result).toEqual([]);
    });
  });
});
