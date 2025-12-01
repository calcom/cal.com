import { describe, expect, it, vi, beforeEach } from "vitest";

import { PrismaClient } from "@calcom/prisma";

import { ScheduleRepository } from "./ScheduleRepository";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    schedule: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

vi.mock("@calcom/lib/hasEditPermissionForUser", () => ({
  hasReadPermissionsForUserId: vi.fn().mockResolvedValue(true),
}));

vi.mock("@calcom/lib/schedules/transformers", () => ({
  transformAvailabilityForAtom: vi.fn().mockReturnValue([]),
  transformDateOverridesForAtom: vi.fn().mockReturnValue([]),
  transformWorkingHoursForAtom: vi.fn().mockReturnValue([]),
}));

describe("ScheduleRepository", () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
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

      const result = await ScheduleRepository.getDefaultScheduleId(userId, prisma);

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

      const result = await ScheduleRepository.getDefaultScheduleId(userId, prisma);

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

      await expect(ScheduleRepository.getDefaultScheduleId(userId, prisma)).rejects.toThrow(
        "No schedules found for user"
      );
    });
  });

  describe("hasDefaultSchedule", () => {
    it("should return true if user has defaultScheduleId", async () => {
      const user = { id: 1, defaultScheduleId: 123 };

      const result = await ScheduleRepository.hasDefaultSchedule(user, prisma);

      expect(result).toBe(true);
    });

    it("should return true if user has a schedule", async () => {
      const user = { id: 1, defaultScheduleId: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.schedule.findFirst as any).mockResolvedValue({
        id: 456,
      });

      const result = await ScheduleRepository.hasDefaultSchedule(user, prisma);

      expect(prisma.schedule.findFirst).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(result).toBe(true);
    });

    it("should return false if user has no defaultScheduleId and no schedules", async () => {
      const user = { id: 1, defaultScheduleId: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.schedule.findFirst as any).mockResolvedValue(null);

      const result = await ScheduleRepository.hasDefaultSchedule(user, prisma);

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

      const result = await ScheduleRepository.setupDefaultSchedule(userId, scheduleId, prisma);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { defaultScheduleId: scheduleId },
      });
      expect(result).toEqual(updatedUser);
    });
  });
});
