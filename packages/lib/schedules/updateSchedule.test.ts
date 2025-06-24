import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { updateSchedule } from "./updateSchedule";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    schedule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/availability", () => ({
  getAvailabilityFromSchedule: vi.fn().mockReturnValue([]),
}));

vi.mock("@calcom/lib/hasEditPermissionForUser", () => ({
  hasEditPermissionForUserID: vi.fn().mockReturnValue(true),
}));

vi.mock("@calcom/lib/schedules/transformers/for-atom", () => ({
  transformScheduleToAvailabilityForAtom: vi.fn().mockReturnValue([]),
}));

vi.mock("@calcom/trpc/server/routers/viewer/availability/util", () => ({
  setupDefaultSchedule: vi.fn(),
}));

describe("updateSchedule - name validation", () => {
  const mockPrisma = {
    schedule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaClient;

  const mockUser = {
    id: 1,
    defaultScheduleId: 1,
    timeZone: "UTC",
  };

  const mockSchedule = {
    id: 1,
    userId: 1,
    name: "Test Schedule",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockPrisma.schedule.findUnique).mockResolvedValue(mockSchedule);
  });

  it("should throw a BAD_REQUEST error when name is an empty string after trimming", async () => {
    const input = {
      scheduleId: 1,
      name: "   ",
      schedule: [],
    };

    await expect(
      updateSchedule({
        input,
        user: mockUser,
        prisma: mockPrisma,
      })
    ).rejects.toThrow(TRPCError);

    await expect(
      updateSchedule({
        input,
        user: mockUser,
        prisma: mockPrisma,
      })
    ).rejects.toThrowError("Schedule name cannot be empty");

    try {
      await updateSchedule({
        input,
        user: mockUser,
        prisma: mockPrisma,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("should not throw an error when name is undefined (no name update)", async () => {
    const input = {
      scheduleId: 1,
      schedule: [],
    };

    const result = await updateSchedule({
      input,
      user: mockUser,
      prisma: mockPrisma,
    });

    expect(result).toBeDefined();
    expect(result.schedule).toEqual(mockSchedule);
    expect(result.isDefault).toBe(true);

    expect(mockPrisma.schedule.update).not.toHaveBeenCalled();
  });
});
