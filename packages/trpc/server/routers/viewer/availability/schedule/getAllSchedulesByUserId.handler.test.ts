import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import type { Schedule } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcSessionUser } from "../../../../types";
import { getAllSchedulesByUserIdHandler } from "./getAllSchedulesByUserId.handler";

const DEFAULT_SCHEDULE_ID = 1;

vi.mock("@calcom/lib/hasEditPermissionForUser", () => ({
  hasReadPermissionsForUserId: vi.fn(),
}));

vi.mock("@calcom/features/schedules/repositories/ScheduleRepository", () => ({
  ScheduleRepository: vi.fn().mockImplementation(function () {
    return {
      getDefaultScheduleId: vi.fn().mockResolvedValue(DEFAULT_SCHEDULE_ID),
    };
  }),
}));

import { hasReadPermissionsForUserId } from "@calcom/lib/hasEditPermissionForUser";

const mockHasReadPermissions = vi.mocked(hasReadPermissionsForUserId);

describe("getAllSchedulesByUserIdHandler", () => {
  const createMockUser = (id: number): NonNullable<TrpcSessionUser> =>
    ({
      id,
      username: `user-${id}`,
      email: `user-${id}@example.com`,
    }) as NonNullable<TrpcSessionUser>;

  const createMockSchedule = (overrides: Partial<Schedule> = {}): Partial<Schedule> => ({
    id: 1,
    userId: 10,
    name: "Working Hours",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.schedule.findMany.mockReset();
  });

  describe("authorization", () => {
    it("returns schedules when user is the owner", async () => {
      const ownerId = 10;
      const user = createMockUser(ownerId);
      const mockSchedules = [createMockSchedule({ userId: ownerId })];

      mockHasReadPermissions.mockResolvedValue(false);
      prismaMock.schedule.findMany.mockResolvedValue(mockSchedules as Schedule[]);

      const result = await getAllSchedulesByUserIdHandler({
        ctx: { user },
        input: { userId: ownerId },
      });

      expect(result.schedules).toHaveLength(1);
      expect(result.schedules[0]).toMatchObject({
        id: 1,
        userId: ownerId,
        name: "Working Hours",
        readOnly: false,
      });
    });

    it("returns schedules when user is part of the same team", async () => {
      const scheduleOwnerId = 10;
      const teamMemberId = 20;
      const user = createMockUser(teamMemberId);
      const mockSchedules = [createMockSchedule({ userId: scheduleOwnerId })];

      mockHasReadPermissions.mockResolvedValue(true);
      prismaMock.schedule.findMany.mockResolvedValue(mockSchedules as Schedule[]);

      const result = await getAllSchedulesByUserIdHandler({
        ctx: { user },
        input: { userId: scheduleOwnerId },
      });

      expect(mockHasReadPermissions).toHaveBeenCalledWith({
        memberId: scheduleOwnerId,
        userId: teamMemberId,
      });
      expect(result.schedules).toHaveLength(1);
      expect(result.schedules[0].readOnly).toBe(true);
    });

    it("throws UNAUTHORIZED when user is not owner and not part of team", async () => {
      const scheduleOwnerId = 10;
      const unauthorizedUserId = 999;
      const user = createMockUser(unauthorizedUserId);

      mockHasReadPermissions.mockResolvedValue(false);

      await expect(
        getAllSchedulesByUserIdHandler({
          ctx: { user },
          input: { userId: scheduleOwnerId },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      expect(mockHasReadPermissions).toHaveBeenCalledWith({
        memberId: scheduleOwnerId,
        userId: unauthorizedUserId,
      });
      expect(prismaMock.schedule.findMany).not.toHaveBeenCalled();
    });
  });

  describe("schedule retrieval", () => {
    it("marks exactly one schedule as default", async () => {
      const ownerId = 10;
      const user = createMockUser(ownerId);
      const mockSchedules = [
        createMockSchedule({ id: DEFAULT_SCHEDULE_ID, userId: ownerId }),
        createMockSchedule({ id: 2, userId: ownerId, name: "Evening Hours" }),
      ];

      mockHasReadPermissions.mockResolvedValue(false);
      prismaMock.schedule.findMany.mockResolvedValue(mockSchedules as Schedule[]);

      const result = await getAllSchedulesByUserIdHandler({
        ctx: { user },
        input: { userId: ownerId },
      });

      const defaultSchedules = result.schedules.filter((s) => s.isDefault);
      expect(defaultSchedules).toHaveLength(1);
      expect(defaultSchedules[0].id).toBe(DEFAULT_SCHEDULE_ID);
    });

    it("returns multiple schedules for user", async () => {
      const ownerId = 10;
      const user = createMockUser(ownerId);
      const mockSchedules = [
        createMockSchedule({ id: 1, userId: ownerId, name: "Morning" }),
        createMockSchedule({ id: 2, userId: ownerId, name: "Afternoon" }),
        createMockSchedule({ id: 3, userId: ownerId, name: "Evening" }),
      ];

      mockHasReadPermissions.mockResolvedValue(false);
      prismaMock.schedule.findMany.mockResolvedValue(mockSchedules as Schedule[]);

      const result = await getAllSchedulesByUserIdHandler({
        ctx: { user },
        input: { userId: ownerId },
      });

      expect(result.schedules).toHaveLength(3);
      expect(result.schedules.map((s) => s.name)).toEqual(["Morning", "Afternoon", "Evening"]);
    });
  });
});
