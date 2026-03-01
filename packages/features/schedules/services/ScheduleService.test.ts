import { HttpError } from "@calcom/lib/http-error";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleService, ZUpdateInputSchema } from "./ScheduleService";

// Create mock prisma client
function createMockPrisma() {
  return {
    schedule: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  };
}

// Mock dependencies
vi.mock("@calcom/lib/availability", () => ({
  getAvailabilityFromSchedule: vi.fn().mockReturnValue([
    {
      startTime: new Date("1970-01-01T09:00:00Z"),
      endTime: new Date("1970-01-01T17:00:00Z"),
      days: [1, 2, 3, 4, 5],
      date: null,
    },
  ]),
}));

vi.mock("@calcom/lib/hasEditPermissionForUser", () => ({
  hasEditPermissionForUserID: vi.fn().mockResolvedValue(false),
}));

vi.mock("@calcom/lib/schedules/transformers/for-atom", () => ({
  transformScheduleToAvailabilityForAtom: vi.fn().mockReturnValue({
    schedule: [],
    dateOverrides: [],
  }),
}));

const mockSetupDefaultSchedule = vi.fn();
vi.mock("../repositories/ScheduleRepository", () => {
  const MockScheduleRepository = class {
    setupDefaultSchedule = mockSetupDefaultSchedule;
    constructor(_prisma: unknown) {
      // no-op
    }
  };
  return { ScheduleRepository: MockScheduleRepository };
});

describe("ScheduleService", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ScheduleService;

  const defaultUser = {
    id: 1,
    defaultScheduleId: 1,
    timeZone: "America/New_York",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new ScheduleService(mockPrisma as never);
    mockSetupDefaultSchedule.mockResolvedValue({ defaultScheduleId: 1 });
  });

  describe("ZUpdateInputSchema validation", () => {
    it("should validate a minimal update with just scheduleId", () => {
      const result = ZUpdateInputSchema.safeParse({ scheduleId: 1 });
      expect(result.success).toBe(true);
    });

    it("should reject empty schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "Working Hours",
      });
      expect(result.success).toBe(true);
    });

    it("should trim schedule name", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        name: "  Working Hours  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Working Hours");
      }
    });

    it("should validate isDefault as boolean", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        isDefault: true,
      });
      expect(result.success).toBe(true);
    });

    it("should validate schedule array format", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        schedule: [
          [
            {
              start: new Date("2024-01-15T09:00:00Z"),
              end: new Date("2024-01-15T17:00:00Z"),
            },
          ],
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should validate dateOverrides format", () => {
      const result = ZUpdateInputSchema.safeParse({
        scheduleId: 1,
        dateOverrides: [
          {
            start: new Date("2024-01-15T10:00:00Z"),
            end: new Date("2024-01-15T14:00:00Z"),
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("update", () => {
    it("should throw 401 when schedule is not found", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue(null);

      await expect(
        service.update({
          input: { scheduleId: 999, name: "Test" },
          user: defaultUser,
        })
      ).rejects.toThrow(HttpError);
    });

    it("should throw 401 when user does not own schedule and has no edit permission", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 999, // Different user
        name: "Other Schedule",
        id: 1,
      });

      const { hasEditPermissionForUserID } = await import("@calcom/lib/hasEditPermissionForUser");
      vi.mocked(hasEditPermissionForUserID).mockResolvedValue(false);

      await expect(
        service.update({
          input: { scheduleId: 1, name: "Updated" },
          user: defaultUser,
        })
      ).rejects.toThrow(HttpError);
    });

    it("should allow update when user has edit permission for other user's schedule", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 999,
        name: "Other Schedule",
        id: 1,
      });

      const { hasEditPermissionForUserID } = await import("@calcom/lib/hasEditPermissionForUser");
      vi.mocked(hasEditPermissionForUserID).mockResolvedValue(true);

      mockPrisma.schedule.update.mockResolvedValue({
        id: 1,
        userId: 999,
        name: "Updated Schedule",
        availability: [],
        timeZone: "UTC",
        eventType: [],
      });

      const result = await service.update({
        input: { scheduleId: 1, name: "Updated Schedule" },
        user: defaultUser,
      });

      expect(result.schedule.name).toBe("Updated Schedule");
    });

    it("should return early with schedule info when no name is provided (default only)", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "My Schedule",
        id: 1,
      });

      const result = await service.update({
        input: { scheduleId: 1, isDefault: true },
        user: defaultUser,
      });

      expect(result.schedule).toEqual({ userId: 1, name: "My Schedule", id: 1 });
      expect(result.isDefault).toBe(true);
      // schedule.update should NOT be called since no name was provided
      expect(mockPrisma.schedule.update).not.toHaveBeenCalled();
    });

    it("should update schedule with new name and availability", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "Old Schedule",
        id: 1,
      });

      mockPrisma.schedule.update.mockResolvedValue({
        id: 1,
        userId: 1,
        name: "New Schedule",
        availability: [
          {
            days: [1, 2, 3, 4, 5],
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            date: null,
          },
        ],
        timeZone: "America/New_York",
        eventType: [],
      });

      const result = await service.update({
        input: {
          scheduleId: 1,
          name: "New Schedule",
          schedule: [
            [
              {
                start: new Date("1970-01-01T09:00:00Z"),
                end: new Date("1970-01-01T17:00:00Z"),
              },
            ],
          ],
        },
        user: defaultUser,
      });

      expect(result.schedule.name).toBe("New Schedule");
      expect(mockPrisma.schedule.update).toHaveBeenCalled();
    });

    it("should set schedule as default when isDefault is true", async () => {
      mockSetupDefaultSchedule.mockResolvedValue({ defaultScheduleId: 2 });

      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "My Schedule",
        id: 2,
      });

      mockPrisma.schedule.update.mockResolvedValue({
        id: 2,
        userId: 1,
        name: "My Schedule",
        availability: [],
        timeZone: "UTC",
        eventType: [],
      });

      const result = await service.update({
        input: { scheduleId: 2, name: "My Schedule", isDefault: true },
        user: { ...defaultUser, defaultScheduleId: 1 },
      });

      expect(result.isDefault).toBe(true);
    });

    it("should update timezone when provided", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "My Schedule",
        id: 1,
      });

      mockPrisma.schedule.update.mockResolvedValue({
        id: 1,
        userId: 1,
        name: "My Schedule",
        availability: [],
        timeZone: "Europe/London",
        eventType: [],
      });

      const result = await service.update({
        input: {
          scheduleId: 1,
          name: "My Schedule",
          timeZone: "Europe/London",
        },
        user: defaultUser,
      });

      expect(result.timeZone).toBe("Europe/London");
    });

    it("should fall back to user timezone when schedule timezone is null", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "My Schedule",
        id: 1,
      });

      mockPrisma.schedule.update.mockResolvedValue({
        id: 1,
        userId: 1,
        name: "My Schedule",
        availability: [],
        timeZone: null,
        eventType: [],
      });

      const result = await service.update({
        input: { scheduleId: 1, name: "My Schedule" },
        user: defaultUser,
      });

      expect(result.timeZone).toBe("America/New_York");
    });

    it("should handle dateOverrides in the update", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "My Schedule",
        id: 1,
      });

      mockPrisma.schedule.update.mockResolvedValue({
        id: 1,
        userId: 1,
        name: "My Schedule",
        availability: [],
        timeZone: "UTC",
        eventType: [],
      });

      await service.update({
        input: {
          scheduleId: 1,
          name: "My Schedule",
          dateOverrides: [
            {
              start: new Date("2024-12-25T10:00:00Z"),
              end: new Date("2024-12-25T14:00:00Z"),
            },
          ],
        },
        user: defaultUser,
      });

      expect(mockPrisma.schedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            availability: expect.objectContaining({
              createMany: expect.objectContaining({
                data: expect.arrayContaining([
                  expect.objectContaining({
                    date: new Date("2024-12-25T10:00:00Z"),
                  }),
                ]),
              }),
            }),
          }),
        })
      );
    });

    it("should return prevDefaultId and currentDefaultId", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "My Schedule",
        id: 2,
      });

      mockPrisma.schedule.update.mockResolvedValue({
        id: 2,
        userId: 1,
        name: "My Schedule",
        availability: [],
        timeZone: "UTC",
        eventType: [],
      });

      const result = await service.update({
        input: { scheduleId: 2, name: "My Schedule" },
        user: { ...defaultUser, defaultScheduleId: 1 },
      });

      expect(result.prevDefaultId).toBe(1);
      expect(result.currentDefaultId).toBe(1);
    });

    it("should delete existing availability before creating new ones", async () => {
      mockPrisma.schedule.findUnique.mockResolvedValue({
        userId: 1,
        name: "My Schedule",
        id: 1,
      });

      mockPrisma.schedule.update.mockResolvedValue({
        id: 1,
        userId: 1,
        name: "My Schedule",
        availability: [],
        timeZone: "UTC",
        eventType: [],
      });

      await service.update({
        input: {
          scheduleId: 1,
          name: "My Schedule",
          schedule: [
            [
              {
                start: new Date("1970-01-01T10:00:00Z"),
                end: new Date("1970-01-01T18:00:00Z"),
              },
            ],
          ],
        },
        user: defaultUser,
      });

      expect(mockPrisma.schedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            availability: expect.objectContaining({
              deleteMany: expect.objectContaining({
                scheduleId: { equals: 1 },
              }),
            }),
          }),
        })
      );
    });
  });
});
