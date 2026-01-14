import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@calcom/prisma";

import { SeatChangeTrackingService } from "../SeatChangeTrackingService";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    seatChangeLog: {
      create: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("SeatChangeTrackingService", () => {
  let service: SeatChangeTrackingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SeatChangeTrackingService();
  });

  describe("logSeatAddition", () => {
    it("should log seat addition with correct data", async () => {
      const teamId = 1;
      const userId = 100;
      const triggeredBy = 50;

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: teamId,
        isOrganization: false,
        teamBilling: { id: "team-billing-123" },
        organizationBilling: null,
      } as any);

      vi.mocked(prisma.seatChangeLog.create).mockResolvedValue({} as any);

      await service.logSeatAddition({
        teamId,
        userId,
        triggeredBy,
        seatCount: 1,
        metadata: { test: "data" },
      });

      expect(prisma.seatChangeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId,
          changeType: "ADDITION",
          seatCount: 1,
          userId,
          triggeredBy,
          teamBillingId: "team-billing-123",
          organizationBillingId: null,
        }),
      });
    });

    it("should use organization billing ID for organizations", async () => {
      const teamId = 1;

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: teamId,
        isOrganization: true,
        teamBilling: null,
        organizationBilling: { id: "org-billing-456" },
      } as any);

      vi.mocked(prisma.seatChangeLog.create).mockResolvedValue({} as any);

      await service.logSeatAddition({
        teamId,
        userId: 100,
      });

      expect(prisma.seatChangeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamBillingId: null,
          organizationBillingId: "org-billing-456",
        }),
      });
    });

    it("should throw error if team not found", async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      await expect(
        service.logSeatAddition({
          teamId: 999,
          userId: 100,
        })
      ).rejects.toThrow("Team 999 not found");
    });

    it("should calculate month key correctly", async () => {
      const teamId = 1;

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: teamId,
        isOrganization: false,
        teamBilling: { id: "team-billing-123" },
        organizationBilling: null,
      } as any);

      vi.mocked(prisma.seatChangeLog.create).mockResolvedValue({} as any);

      // Mock date to January 2026
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));

      await service.logSeatAddition({
        teamId,
        userId: 100,
      });

      expect(prisma.seatChangeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          monthKey: "2026-01",
        }),
      });

      vi.useRealTimers();
    });
  });

  describe("logSeatRemoval", () => {
    it("should log seat removal with correct data", async () => {
      const teamId = 1;
      const userId = 100;

      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        id: teamId,
        isOrganization: false,
        teamBilling: { id: "team-billing-123" },
        organizationBilling: null,
      } as any);

      vi.mocked(prisma.seatChangeLog.create).mockResolvedValue({} as any);

      await service.logSeatRemoval({
        teamId,
        userId,
        seatCount: 2,
      });

      expect(prisma.seatChangeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          teamId,
          changeType: "REMOVAL",
          seatCount: 2,
          userId,
        }),
      });
    });
  });

  describe("getMonthlyChanges", () => {
    it("should calculate net change correctly", async () => {
      const teamId = 1;
      const monthKey = "2026-01";

      vi.mocked(prisma.seatChangeLog.groupBy).mockResolvedValue([
        {
          changeType: "ADDITION" as const,
          _sum: { seatCount: 10 },
        },
        {
          changeType: "REMOVAL" as const,
          _sum: { seatCount: 3 },
        },
      ] as any);

      const result = await service.getMonthlyChanges({ teamId, monthKey });

      expect(result).toEqual({
        additions: 10,
        removals: 3,
        netChange: 7,
      });
    });

    it("should handle month with only additions", async () => {
      vi.mocked(prisma.seatChangeLog.groupBy).mockResolvedValue([
        {
          changeType: "ADDITION" as const,
          _sum: { seatCount: 5 },
        },
      ] as any);

      const result = await service.getMonthlyChanges({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toEqual({
        additions: 5,
        removals: 0,
        netChange: 5,
      });
    });

    it("should handle month with only removals", async () => {
      vi.mocked(prisma.seatChangeLog.groupBy).mockResolvedValue([
        {
          changeType: "REMOVAL" as const,
          _sum: { seatCount: 3 },
        },
      ] as any);

      const result = await service.getMonthlyChanges({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toEqual({
        additions: 0,
        removals: 3,
        netChange: 0, // Never negative
      });
    });

    it("should cap net change at 0 for negative values", async () => {
      vi.mocked(prisma.seatChangeLog.groupBy).mockResolvedValue([
        {
          changeType: "ADDITION" as const,
          _sum: { seatCount: 2 },
        },
        {
          changeType: "REMOVAL" as const,
          _sum: { seatCount: 5 },
        },
      ] as any);

      const result = await service.getMonthlyChanges({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toEqual({
        additions: 2,
        removals: 5,
        netChange: 0, // Capped at 0
      });
    });

    it("should handle month with no changes", async () => {
      vi.mocked(prisma.seatChangeLog.groupBy).mockResolvedValue([]);

      const result = await service.getMonthlyChanges({
        teamId: 1,
        monthKey: "2026-01",
      });

      expect(result).toEqual({
        additions: 0,
        removals: 0,
        netChange: 0,
      });
    });
  });

  describe("getUnprocessedChanges", () => {
    it("should fetch unprocessed changes for a team and month", async () => {
      const teamId = 1;
      const monthKey = "2026-01";

      const mockChanges = [
        { id: "1", teamId, monthKey, changeType: "ADDITION" },
        { id: "2", teamId, monthKey, changeType: "REMOVAL" },
      ];

      vi.mocked(prisma.seatChangeLog.findMany).mockResolvedValue(mockChanges as any);

      const result = await service.getUnprocessedChanges({ teamId, monthKey });

      expect(result).toEqual(mockChanges);
      expect(prisma.seatChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          teamId,
          monthKey,
          processedInProrationId: null,
        },
        orderBy: {
          changeDate: "asc",
        },
      });
    });
  });

  describe("markAsProcessed", () => {
    it("should mark changes as processed and return count", async () => {
      const teamId = 1;
      const monthKey = "2026-01";
      const prorationId = "proration-123";

      vi.mocked(prisma.seatChangeLog.updateMany).mockResolvedValue({ count: 5 } as any);

      const count = await service.markAsProcessed({ teamId, monthKey, prorationId });

      expect(count).toBe(5);
      expect(prisma.seatChangeLog.updateMany).toHaveBeenCalledWith({
        where: {
          teamId,
          monthKey,
          processedInProrationId: null,
        },
        data: {
          processedInProrationId: prorationId,
        },
      });
    });
  });
});
