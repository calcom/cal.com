import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { HolidayRepository } from "./HolidayRepository";

describe("HolidayRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findUserSettings", () => {
    it("should return user holiday settings when they exist", async () => {
      const mockSettings = {
        id: 1,
        userId: 123,
        countryCode: "US",
        disabledIds: ["holiday_1", "holiday_2"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.userHolidaySettings.findUnique.mockResolvedValue(mockSettings);

      const result = await HolidayRepository.findUserSettings({ userId: 123 });

      expect(prismaMock.userHolidaySettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 123 },
        select: {
          id: true,
          userId: true,
          countryCode: true,
          disabledIds: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockSettings);
    });

    it("should return null when user has no holiday settings", async () => {
      prismaMock.userHolidaySettings.findUnique.mockResolvedValue(null);

      const result = await HolidayRepository.findUserSettings({ userId: 456 });

      expect(prismaMock.userHolidaySettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 456 },
        select: expect.any(Object),
      });
      expect(result).toBeNull();
    });
  });

  describe("findUserSettingsSelect", () => {
    it("should return user settings with custom select", async () => {
      const mockSettings = {
        countryCode: "GB",
        disabledIds: [],
      };

      prismaMock.userHolidaySettings.findUnique.mockResolvedValue(mockSettings);

      const result = await HolidayRepository.findUserSettingsSelect({
        userId: 123,
        select: {
          countryCode: true,
          disabledIds: true,
        },
      });

      expect(prismaMock.userHolidaySettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 123 },
        select: {
          countryCode: true,
          disabledIds: true,
        },
      });
      expect(result).toEqual(mockSettings);
    });
  });

  describe("upsertUserSettings", () => {
    it("should create new settings when user has none", async () => {
      const mockSettings = {
        id: 1,
        userId: 123,
        countryCode: "US",
        disabledIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.userHolidaySettings.upsert.mockResolvedValue(mockSettings);

      const result = await HolidayRepository.upsertUserSettings({
        userId: 123,
        countryCode: "US",
      });

      expect(prismaMock.userHolidaySettings.upsert).toHaveBeenCalledWith({
        where: { userId: 123 },
        create: {
          userId: 123,
          countryCode: "US",
          disabledIds: [],
        },
        update: {
          countryCode: "US",
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSettings);
    });

    it("should reset disabled holidays when resetDisabledHolidays is true", async () => {
      const mockSettings = {
        id: 1,
        userId: 123,
        countryCode: "GB",
        disabledIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.userHolidaySettings.upsert.mockResolvedValue(mockSettings);

      const result = await HolidayRepository.upsertUserSettings({
        userId: 123,
        countryCode: "GB",
        resetDisabledHolidays: true,
      });

      expect(prismaMock.userHolidaySettings.upsert).toHaveBeenCalledWith({
        where: { userId: 123 },
        create: {
          userId: 123,
          countryCode: "GB",
          disabledIds: [],
        },
        update: {
          countryCode: "GB",
          disabledIds: [],
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSettings);
    });
  });

  describe("updateDisabledIds", () => {
    it("should update disabled holiday IDs", async () => {
      const mockSettings = {
        id: 1,
        userId: 123,
        countryCode: "US",
        disabledIds: ["christmas_2025", "thanksgiving_2025"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.userHolidaySettings.update.mockResolvedValue(mockSettings);

      const result = await HolidayRepository.updateDisabledIds({
        userId: 123,
        disabledIds: ["christmas_2025", "thanksgiving_2025"],
      });

      expect(prismaMock.userHolidaySettings.update).toHaveBeenCalledWith({
        where: { userId: 123 },
        data: { disabledIds: ["christmas_2025", "thanksgiving_2025"] },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockSettings);
    });
  });

  describe("findManyCachedHolidays", () => {
    it("should return cached holidays for country and year", async () => {
      const mockHolidays = [
        {
          id: "1",
          countryCode: "US",
          calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
          eventId: "new_years_day_2025",
          name: "New Year's Day",
          date: new Date("2025-01-01"),
          year: 2025,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          countryCode: "US",
          calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
          eventId: "christmas_2025",
          name: "Christmas Day",
          date: new Date("2025-12-25"),
          year: 2025,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.holidayCache.findMany.mockResolvedValue(mockHolidays);

      const result = await HolidayRepository.findManyCachedHolidays({
        countryCode: "US",
        year: 2025,
      });

      expect(prismaMock.holidayCache.findMany).toHaveBeenCalledWith({
        where: {
          countryCode: "US",
          year: 2025,
        },
        orderBy: {
          date: "asc",
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockHolidays);
    });

    it("should return empty array when no holidays found", async () => {
      prismaMock.holidayCache.findMany.mockResolvedValue([]);

      const result = await HolidayRepository.findManyCachedHolidays({
        countryCode: "XX",
        year: 2025,
      });

      expect(result).toEqual([]);
    });
  });

  describe("findFirstCacheEntry", () => {
    it("should return first cache entry for staleness check", async () => {
      const mockEntry = {
        id: "1",
        countryCode: "US",
        calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
        eventId: "new_years_day_2025",
        name: "New Year's Day",
        date: new Date("2025-01-01"),
        year: 2025,
        createdAt: new Date(),
        updatedAt: new Date("2025-01-15"),
      };

      prismaMock.holidayCache.findFirst.mockResolvedValue(mockEntry);

      const result = await HolidayRepository.findFirstCacheEntry({
        countryCode: "US",
        year: 2025,
      });

      expect(prismaMock.holidayCache.findFirst).toHaveBeenCalledWith({
        where: {
          countryCode: "US",
          year: 2025,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockEntry);
    });

    it("should return null when no cache entry exists", async () => {
      prismaMock.holidayCache.findFirst.mockResolvedValue(null);

      const result = await HolidayRepository.findFirstCacheEntry({
        countryCode: "US",
        year: 2030,
      });

      expect(result).toBeNull();
    });
  });

  describe("findCachedHolidaysInRange", () => {
    it("should return holidays within date range", async () => {
      const mockHolidays = [
        {
          id: "1",
          countryCode: "US",
          calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
          eventId: "christmas_2025",
          name: "Christmas Day",
          date: new Date("2025-12-25"),
          year: 2025,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.holidayCache.findMany.mockResolvedValue(mockHolidays);

      const startDate = new Date("2025-12-01");
      const endDate = new Date("2025-12-31");

      const result = await HolidayRepository.findCachedHolidaysInRange({
        countryCode: "US",
        startDate,
        endDate,
      });

      expect(prismaMock.holidayCache.findMany).toHaveBeenCalledWith({
        where: {
          countryCode: "US",
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: "asc",
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockHolidays);
    });
  });
});
