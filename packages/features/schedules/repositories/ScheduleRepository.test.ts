import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import type { Schedule, User } from "@calcom/prisma/client";

import { ScheduleRepository } from "./ScheduleRepository";

vi.mock("@calcom/lib/hasEditPermissionForUser", () => ({
  hasReadPermissionsForUserId: vi.fn(),
}));

import { hasReadPermissionsForUserId } from "@calcom/lib/hasEditPermissionForUser";

const mockHasReadPermissions = vi.mocked(hasReadPermissionsForUserId);

describe("ScheduleRepository", () => {
  let scheduleRepository: ScheduleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = new ScheduleRepository(prismaMock);
  });

  describe("constructor", () => {
    it("should throw error if prismaClient is not provided", () => {
      // @ts-expect-error - testing invalid input
      expect(() => new ScheduleRepository(null)).toThrow("PrismaClient is required for ScheduleRepository");
      // @ts-expect-error - testing invalid input
      expect(() => new ScheduleRepository(undefined)).toThrow(
        "PrismaClient is required for ScheduleRepository"
      );
    });

    it("should create instance successfully with valid prismaClient", () => {
      const repo = new ScheduleRepository(prismaMock);
      expect(repo).toBeInstanceOf(ScheduleRepository);
    });
  });

  describe("getDefaultScheduleId", () => {
    it("should return defaultScheduleId if user has one", async () => {
      const userId = 1;
      const defaultScheduleId = 123;

      prismaMock.user.findUnique.mockResolvedValue({ defaultScheduleId } as User);

      const result = await scheduleRepository.getDefaultScheduleId(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { defaultScheduleId: true },
      });
      expect(result).toBe(defaultScheduleId);
    });

    it("should find and return first schedule if user has no defaultScheduleId", async () => {
      const userId = 1;
      const scheduleId = 456;

      prismaMock.user.findUnique.mockResolvedValue({ defaultScheduleId: null } as User);
      prismaMock.schedule.findFirst.mockResolvedValue({ id: scheduleId } as Schedule);

      const result = await scheduleRepository.getDefaultScheduleId(userId);

      expect(prismaMock.schedule.findFirst).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true },
      });
      expect(result).toBe(scheduleId);
    });

    it("should throw error if no schedules found", async () => {
      const userId = 1;

      prismaMock.user.findUnique.mockResolvedValue({ defaultScheduleId: null } as User);
      prismaMock.schedule.findFirst.mockResolvedValue(null);

      await expect(scheduleRepository.getDefaultScheduleId(userId)).rejects.toThrow(
        "No schedules found for user"
      );
    });
  });

  describe("hasDefaultSchedule", () => {
    it("should return true if user has defaultScheduleId", async () => {
      const user = { id: 1, defaultScheduleId: 123 };

      const result = await scheduleRepository.hasDefaultSchedule(user);

      expect(result).toBe(true);
    });

    it("should return true if user has a schedule", async () => {
      const user = { id: 1, defaultScheduleId: null };

      prismaMock.schedule.findFirst.mockResolvedValue({ id: 456 } as Schedule);

      const result = await scheduleRepository.hasDefaultSchedule(user);

      expect(prismaMock.schedule.findFirst).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(result).toBe(true);
    });

    it("should return false if user has no defaultScheduleId and no schedules", async () => {
      const user = { id: 1, defaultScheduleId: null };

      prismaMock.schedule.findFirst.mockResolvedValue(null);

      const result = await scheduleRepository.hasDefaultSchedule(user);

      expect(result).toBe(false);
    });
  });

  describe("setupDefaultSchedule", () => {
    it("should update user with new defaultScheduleId", async () => {
      const userId = 1;
      const scheduleId = 123;
      const updatedUser = { id: userId, defaultScheduleId: scheduleId } as User;

      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await scheduleRepository.setupDefaultSchedule(userId, scheduleId);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { defaultScheduleId: scheduleId },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe("findDetailedScheduleById", () => {
    const createMockSchedule = (overrides: Partial<Schedule> = {}): Partial<Schedule> => ({
      id: 100,
      userId: 2,
      name: "Working Hours",
      availability: [],
      timeZone: "America/New_York",
      ...overrides,
    });

    beforeEach(() => {
      prismaMock.schedule.count.mockResolvedValue(1);
    });

    it("should allow access when user is the schedule owner", async () => {
      const ownerId = 2;
      const mockSchedule = createMockSchedule({ userId: ownerId });

      prismaMock.schedule.findUnique.mockResolvedValue(mockSchedule as Schedule);
      mockHasReadPermissions.mockResolvedValue(false);

      const result = await scheduleRepository.findDetailedScheduleById({
        scheduleId: 100,
        userId: ownerId,
        timeZone: "UTC",
        defaultScheduleId: 100,
      });

      expect(result).toMatchObject({
        id: 100,
        name: "Working Hours",
        userId: ownerId,
      });
    });

    it("should allow access when user is part of the same team", async () => {
      const scheduleOwnerId = 2;
      const teamMemberId = 3;
      const mockSchedule = createMockSchedule({ userId: scheduleOwnerId });

      prismaMock.schedule.findUnique.mockResolvedValue(mockSchedule as Schedule);
      mockHasReadPermissions.mockResolvedValue(true);

      const result = await scheduleRepository.findDetailedScheduleById({
        scheduleId: 100,
        userId: teamMemberId,
        timeZone: "UTC",
        defaultScheduleId: null,
      });

      expect(mockHasReadPermissions).toHaveBeenCalledWith({
        memberId: scheduleOwnerId,
        userId: teamMemberId,
      });
      expect(result).toMatchObject({
        id: 100,
        name: "Working Hours",
        userId: scheduleOwnerId,
      });
    });

    it("should deny access when user is not owner and not part of team", async () => {
      const scheduleOwnerId = 2;
      const unauthorizedUserId = 999;
      const mockSchedule = createMockSchedule({ userId: scheduleOwnerId });

      prismaMock.schedule.findUnique.mockResolvedValue(mockSchedule as Schedule);
      mockHasReadPermissions.mockResolvedValue(false);

      await expect(
        scheduleRepository.findDetailedScheduleById({
          scheduleId: 100,
          userId: unauthorizedUserId,
          timeZone: "UTC",
          defaultScheduleId: null,
        })
      ).rejects.toThrow("UNAUTHORIZED");

      expect(mockHasReadPermissions).toHaveBeenCalledWith({
        memberId: scheduleOwnerId,
        userId: unauthorizedUserId,
      });
    });

    it("should throw error when schedule is not found", async () => {
      prismaMock.schedule.findUnique.mockResolvedValue(null);

      await expect(
        scheduleRepository.findDetailedScheduleById({
          scheduleId: 999,
          userId: 1,
          timeZone: "UTC",
          defaultScheduleId: null,
        })
      ).rejects.toThrow("Schedule not found");
    });
  });
});
