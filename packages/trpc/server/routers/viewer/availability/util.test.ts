import { describe, expect, it, vi, beforeEach } from "vitest";

import { HostRepository } from "@calcom/lib/server/repository/host";
import { PrismaClient } from "@calcom/prisma";

import { getDefaultScheduleId, hasDefaultSchedule, setupDefaultSchedule } from "./util";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    schedule: {
      findFirst: vi.fn(),
    },
    host: {
      updateMany: vi.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe("Availability Utils", () => {
  let prisma: PrismaClient;
  let hostRepo: HostRepository;

  beforeEach(() => {
    prisma = new PrismaClient();
    hostRepo = new HostRepository(prisma);
    vi.clearAllMocks();
  });

  describe("getDefaultScheduleId", () => {
    it("should return defaultScheduleId if user has one", async () => {
      const userId = 1;
      const defaultScheduleId = 123;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultScheduleId,
      });

      const result = await getDefaultScheduleId(userId, prisma);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { defaultScheduleId: true },
      });
      expect(result).toBe(defaultScheduleId);
    });

    it("should find and return first schedule if user has no defaultScheduleId", async () => {
      const userId = 1;
      const scheduleId = 456;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultScheduleId: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.schedule.findFirst as any).mockResolvedValue({
        id: scheduleId,
      });

      const result = await getDefaultScheduleId(userId, prisma);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { defaultScheduleId: true },
      });
      expect(prisma.schedule.findFirst).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true },
      });
      expect(result).toBe(scheduleId);
    });

    it("should throw error if no schedules found", async () => {
      const userId = 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.user.findUnique as any).mockResolvedValue({
        defaultScheduleId: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.schedule.findFirst as any).mockResolvedValue(null);

      await expect(getDefaultScheduleId(userId, prisma)).rejects.toThrow("No schedules found for user");
    });
  });

  describe("hasDefaultSchedule", () => {
    it("should return true if user has defaultScheduleId", async () => {
      const user = { id: 1, defaultScheduleId: 123 };

      const result = await hasDefaultSchedule(user, prisma);

      expect(result).toBe(true);
    });

    it("should return true if user has a schedule", async () => {
      const user = { id: 1, defaultScheduleId: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.schedule.findFirst as any).mockResolvedValue({
        id: 456,
      });

      const result = await hasDefaultSchedule(user, prisma);

      expect(prisma.schedule.findFirst).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(result).toBe(true);
    });

    it("should return false if user has no defaultScheduleId and no schedules", async () => {
      const user = { id: 1, defaultScheduleId: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.schedule.findFirst as any).mockResolvedValue(null);

      const result = await hasDefaultSchedule(user, prisma);

      expect(prisma.schedule.findFirst).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(result).toBe(false);
    });
  });

  describe("setupDefaultSchedule", () => {
    it("should update user with new defaultScheduleId", async () => {
      const userId = 1;
      const scheduleId = 123;
      const updatedUser = { id: userId, defaultScheduleId: scheduleId };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.user.update as any).mockResolvedValue(updatedUser);

      const result = await setupDefaultSchedule(userId, scheduleId, prisma);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { defaultScheduleId: scheduleId },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe("updateHostsWithNewDefaultSchedule", () => {
    it("should update hosts with new scheduleId", async () => {
      const userId = 1;
      const oldScheduleId = 123;
      const newScheduleId = 456;
      const updateResult = { count: 2 }; // 2 hosts updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.host.updateMany as any).mockResolvedValue(updateResult);

      const result = await hostRepo.updateHostsSchedule(userId, oldScheduleId, newScheduleId);

      expect(prisma.host.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          scheduleId: oldScheduleId,
        },
        data: {
          scheduleId: newScheduleId,
        },
      });
      expect(result).toEqual(updateResult);
    });

    it("should handle case with no hosts to update", async () => {
      const userId = 1;
      const oldScheduleId = 123;
      const newScheduleId = 456;
      const updateResult = { count: 0 }; // No hosts updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.host.updateMany as any).mockResolvedValue(updateResult);

      const result = await hostRepo.updateHostsSchedule(userId, oldScheduleId, newScheduleId);

      expect(prisma.host.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          scheduleId: oldScheduleId,
        },
        data: {
          scheduleId: newScheduleId,
        },
      });
      expect(result).toEqual(updateResult);
    });
  });
});
