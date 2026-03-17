import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaHolidayRepository } from "./PrismaHolidayRepository";

const mockUserHolidaySettings = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
};

const mockPrismaClient = {
  userHolidaySettings: mockUserHolidaySettings,
} as never;

describe("PrismaHolidayRepository", () => {
  let repo: PrismaHolidayRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PrismaHolidayRepository(mockPrismaClient);
  });

  describe("findUserSettingsSelect", () => {
    it("should query by single userId with custom select", async () => {
      const mockSettings = { countryCode: "US", disabledIds: [] };
      mockUserHolidaySettings.findUnique.mockResolvedValue(mockSettings);

      const result = await repo.findUserSettingsSelect({
        userId: 123,
        select: { countryCode: true, disabledIds: true },
      });

      expect(mockUserHolidaySettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 123 },
        select: { countryCode: true, disabledIds: true },
      });
      expect(result).toEqual(mockSettings);
    });
  });

  describe("findManyUserSettings", () => {
    it("should batch-fetch holiday settings for multiple users", async () => {
      const mockSettingsAll = [
        { userId: 1, countryCode: "US", disabledIds: [] },
        { userId: 2, countryCode: "GB", disabledIds: ["christmas_2025"] },
      ];
      mockUserHolidaySettings.findMany.mockResolvedValue(mockSettingsAll);

      const result = await repo.findManyUserSettings({
        userIds: [1, 2, 3],
        select: { countryCode: true, disabledIds: true },
      });

      expect(mockUserHolidaySettings.findMany).toHaveBeenCalledWith({
        where: { userId: { in: [1, 2, 3] } },
        select: { userId: true, countryCode: true, disabledIds: true },
      });
      expect(result).toEqual(mockSettingsAll);
    });

    it("should return empty array when no users have holiday settings", async () => {
      mockUserHolidaySettings.findMany.mockResolvedValue([]);

      const result = await repo.findManyUserSettings({
        userIds: [1, 2],
        select: { countryCode: true, disabledIds: true },
      });

      expect(result).toEqual([]);
    });

    it("should return only users that have settings configured", async () => {
      const mockSettings = [{ userId: 2, countryCode: "US", disabledIds: [] }];
      mockUserHolidaySettings.findMany.mockResolvedValue(mockSettings);

      const result = await repo.findManyUserSettings({
        userIds: [1, 2, 3],
        select: { countryCode: true, disabledIds: true },
      });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(2);
    });
  });
});
