import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheRepository } from "./calendar-cache.repository";

vi.mock("@calcom/prisma", () => ({
  default: prismock,
}));

const mockCalendar: Calendar = {
  getCredentialId: () => 1,
  watchCalendar: vi.fn(),
  unwatchCalendar: vi.fn(),
} as Calendar;

const mockCalendarWithoutWatch: Calendar = {
  getCredentialId: () => 1,
} as Calendar;

const mockInMemoryCredentialCalendar: Calendar = {
  getCredentialId: () => -1,
} as Calendar;

describe("CalendarCacheRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismock.calendarCache.deleteMany();
  });

  describe("getCachedAvailability", () => {
    it("should return cached availability for regular credentials", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const credentialId = 1;
      const userId = 100;
      const args = {
        timeMin: "2025-01-01T00:00:00.000Z",
        timeMax: "2025-02-01T00:00:00.000Z",
        items: [{ id: "test@example.com" }],
      };

      const key = JSON.stringify(args);
      const expiresAt = new Date(Date.now() + 100000);

      await prismock.calendarCache.create({
        data: {
          credentialId,
          userId,
          key,
          value: { calendars: { "test@example.com": { busy: [] } } },
          expiresAt,
        },
      });

      const result = await repository.getCachedAvailability({
        credentialId,
        userId,
        args,
      });

      expect(result).toBeTruthy();
      expect(result?.value).toEqual({ calendars: { "test@example.com": { busy: [] } } });
    });

    it("should return null for expired cache entries", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const credentialId = 1;
      const userId = 100;
      const args = {
        timeMin: "2025-01-01T00:00:00.000Z",
        timeMax: "2025-02-01T00:00:00.000Z",
        items: [{ id: "test@example.com" }],
      };

      await prismock.calendarCache.create({
        data: {
          credentialId,
          userId,
          key: JSON.stringify(args),
          value: { calendars: { "test@example.com": { busy: [] } } },
          expiresAt: new Date(Date.now() - 100000),
        },
      });

      const result = await repository.getCachedAvailability({
        credentialId,
        userId,
        args,
      });

      expect(result).toBeNull();
    });

    it("should handle in-memory delegation credentials", async () => {
      const repository = new CalendarCacheRepository(mockInMemoryCredentialCalendar);
      const credentialId = -1;
      const userId = 100;
      const args = {
        timeMin: "2025-01-01T00:00:00.000Z",
        timeMax: "2025-02-01T00:00:00.000Z",
        items: [{ id: "test@example.com" }],
      };

      await prismock.calendarCache.create({
        data: {
          credentialId: 999,
          userId,
          key: JSON.stringify(args),
          value: { calendars: { "test@example.com": { busy: [] } } },
          expiresAt: new Date(Date.now() + 100000),
        },
      });

      const result = await repository.getCachedAvailability({
        credentialId,
        userId,
        args,
      });

      expect(result).toBeTruthy();
    });

    it("should return null for in-memory delegation credentials without userId", async () => {
      const repository = new CalendarCacheRepository(mockInMemoryCredentialCalendar);
      const credentialId = -1;
      const args = {
        timeMin: "2025-01-01T00:00:00.000Z",
        timeMax: "2025-02-01T00:00:00.000Z",
        items: [{ id: "test@example.com" }],
      };

      const result = await repository.getCachedAvailability({
        credentialId,
        userId: null,
        args,
      });

      expect(result).toBeNull();
    });

    it("should handle unique calendar items in key generation", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const credentialId = 1;
      const userId = 100;
      const args = {
        timeMin: "2025-01-01T00:00:00.000Z",
        timeMax: "2025-02-01T00:00:00.000Z",
        items: [{ id: "test@example.com" }, { id: "test@example.com" }, { id: "other@example.com" }],
      };

      const expectedKey = JSON.stringify({
        timeMin: args.timeMin,
        timeMax: args.timeMax,
        items: [{ id: "test@example.com" }, { id: "other@example.com" }],
      });

      await prismock.calendarCache.create({
        data: {
          credentialId,
          userId,
          key: expectedKey,
          value: { calendars: { "test@example.com": { busy: [] } } },
          expiresAt: new Date(Date.now() + 100000),
        },
      });

      const result = await repository.getCachedAvailability({
        credentialId,
        userId,
        args,
      });

      expect(result).toBeTruthy();
    });
  });

  describe("upsertCachedAvailability", () => {
    it("should create new cache entry", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const credentialId = 1;
      const userId = 100;
      const args = {
        timeMin: "2025-01-01T00:00:00.000Z",
        timeMax: "2025-02-01T00:00:00.000Z",
        items: [{ id: "test@example.com" }],
      };
      const value = { calendars: { "test@example.com": { busy: [] } } };

      await repository.upsertCachedAvailability({
        credentialId,
        userId,
        args,
        value,
      });

      const cached = await prismock.calendarCache.findFirst({
        where: { credentialId },
      });

      expect(cached).toBeTruthy();
      expect(cached?.value).toEqual(value);
      expect(cached?.userId).toBe(userId);
    });

    it("should update existing cache entry", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const credentialId = 1;
      const userId = 100;
      const args = {
        timeMin: "2025-01-01T00:00:00.000Z",
        timeMax: "2025-02-01T00:00:00.000Z",
        items: [{ id: "test@example.com" }],
      };
      const key = JSON.stringify(args);

      await prismock.calendarCache.create({
        data: {
          credentialId,
          userId: null,
          key,
          value: { old: "data" },
          expiresAt: new Date(Date.now() - 100000),
        },
      });

      const newValue = { calendars: { "test@example.com": { busy: [] } } };
      await repository.upsertCachedAvailability({
        credentialId,
        userId,
        args,
        value: newValue,
      });

      const cached = await prismock.calendarCache.findFirst({
        where: { credentialId },
      });

      expect(cached?.value).toEqual(newValue);
      expect(cached?.userId).toBe(userId);
      expect(cached?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should throw error for invalid credentialId", async () => {
      const invalidCalendar = { getCredentialId: () => -5 } as Calendar;
      const repository = new CalendarCacheRepository(invalidCalendar);

      await expect(
        repository.upsertCachedAvailability({
          credentialId: -5,
          userId: 100,
          args: {
            timeMin: "2025-01-01T00:00:00.000Z",
            timeMax: "2025-02-01T00:00:00.000Z",
            items: [{ id: "test@example.com" }],
          },
          value: {},
        })
      ).rejects.toThrow("Received invalid credentialId -5");
    });
  });

  describe("watchCalendar", () => {
    it("should call calendar watchCalendar method", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const args = {
        calendarId: "test@example.com",
        eventTypeIds: [123],
      };

      await repository.watchCalendar(args);

      expect(mockCalendar.watchCalendar).toHaveBeenCalledWith(args);
    });

    it("should skip watching if calendar does not have watchCalendar method", async () => {
      const repository = new CalendarCacheRepository(mockCalendarWithoutWatch);
      const args = {
        calendarId: "test@example.com",
        eventTypeIds: [123],
      };

      await repository.watchCalendar(args);

      expect(mockCalendarWithoutWatch.watchCalendar).toBeUndefined();
    });

    it("should throw error for invalid credentialId", async () => {
      const invalidCalendar = { getCredentialId: () => -5 } as Calendar;
      const repository = new CalendarCacheRepository(invalidCalendar);

      await expect(
        repository.watchCalendar({
          calendarId: "test@example.com",
          eventTypeIds: [123],
        })
      ).rejects.toThrow("Received invalid credentialId -5");
    });
  });

  describe("unwatchCalendar", () => {
    it("should call calendar unwatchCalendar method", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const args = {
        calendarId: "test@example.com",
        eventTypeIds: [123],
      };

      await repository.unwatchCalendar(args);

      expect(mockCalendar.unwatchCalendar).toHaveBeenCalledWith(args);
    });

    it("should skip unwatching if calendar does not have unwatchCalendar method", async () => {
      const repository = new CalendarCacheRepository(mockCalendarWithoutWatch);
      const args = {
        calendarId: "test@example.com",
        eventTypeIds: [123],
      };

      await repository.unwatchCalendar(args);

      expect(mockCalendarWithoutWatch.unwatchCalendar).toBeUndefined();
    });

    it("should throw error for invalid credentialId", async () => {
      const invalidCalendar = { getCredentialId: () => -5 } as Calendar;
      const repository = new CalendarCacheRepository(invalidCalendar);

      await expect(
        repository.unwatchCalendar({
          calendarId: "test@example.com",
          eventTypeIds: [123],
        })
      ).rejects.toThrow("Received invalid credentialId -5");
    });
  });

  describe("getCacheStatusByCredentialIds", () => {
    it("should return cache status for multiple credentials", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const credentialIds = [1, 2, 3];

      await prismock.calendarCache.create({
        data: {
          credentialId: 1,
          userId: 100,
          key: "test-key-1",
          value: {},
          expiresAt: new Date(Date.now() + 100000),
        },
      });

      await prismock.calendarCache.create({
        data: {
          credentialId: 2,
          userId: 100,
          key: "test-key-2",
          value: {},
          expiresAt: new Date(Date.now() + 100000),
        },
      });

      const result = await repository.getCacheStatusByCredentialIds(credentialIds);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.credentialId)).toEqual(expect.arrayContaining([1, 2]));
      expect(result.every((r) => r.updatedAt)).toBe(true);
    });

    it("should return empty array for credentials with no cache", async () => {
      const repository = new CalendarCacheRepository(mockCalendar);
      const credentialIds = [999, 998];

      const result = await repository.getCacheStatusByCredentialIds(credentialIds);

      expect(result).toHaveLength(0);
    });
  });
});
