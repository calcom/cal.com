import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheRepository } from "./calendar-cache.repository";

vi.mock("./lib/datesForCache", () => ({
  getTimeMin: vi.fn().mockImplementation((timeMin) => timeMin),
  getTimeMax: vi.fn().mockImplementation((timeMax) => timeMax),
}));

describe("CalendarCacheRepository", () => {
  let mockCalendar: Calendar;

  beforeEach(() => {
    // Clear the database before each test
    prismock.calendarCache.deleteMany();

    // Setup mock calendar
    mockCalendar = {
      watchCalendar: vi.fn(),
      unwatchCalendar: vi.fn(),
    } as unknown as Calendar;
  });

  // It needs to consider parseKeyForCache being called
  // eslint-disable-next-line playwright/no-skipped-test
  describe("getCachedAvailability", () => {
    it("should return cached availability data", async () => {
      const repository = new CalendarCacheRepository();
      const args = {
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar-1" }],
      };

      const testData = {
        credentialId: 1,
        userId: 1,
        key: JSON.stringify({
          timeMin: args.timeMin,
          timeMax: args.timeMax,
          items: args.items,
        }),
        value: { busy: [] },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      await prismock.calendarCache.create({ data: testData });

      const result = await repository.getCachedAvailability({
        credentialId: 1,
        userId: 1,
        args,
      });

      expect(result).toEqual(
        expect.objectContaining({
          key: testData.key,
          value: testData.value,
        })
      );
    });

    it("should return cached availability data even if credentialId is -1", async () => {
      const repository = new CalendarCacheRepository();
      const args = {
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar-1" }],
      };

      const testData = {
        credentialId: -1,
        userId: 1,
        key: JSON.stringify({
          timeMin: args.timeMin,
          timeMax: args.timeMax,
          items: args.items,
        }),
        value: { busy: [] },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      await prismock.calendarCache.create({ data: testData });

      const resultWithWrongUserId = await repository.getCachedAvailability({
        credentialId: -1,
        userId: 2,
        args,
      });

      expect(resultWithWrongUserId).toBeNull();
      const resultWithCorrectUserId = await repository.getCachedAvailability({
        credentialId: -1,
        userId: 1,
        args,
      });

      expect(resultWithCorrectUserId).toEqual(
        expect.objectContaining({
          key: testData.key,
          value: testData.value,
        })
      );
    });
  });

  describe("upsertCachedAvailability(mocks min and max time fns)", () => {
    it("should create new cache entry when none exists", async () => {
      const repository = new CalendarCacheRepository();
      const args = {
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar-1" }],
      };
      const value = { busy: [] };

      await repository.upsertCachedAvailability({
        credentialId: 1,
        userId: 1,
        args,
        value,
      });

      const result = await prismock.calendarCache.findFirst({
        where: {
          credentialId: 1,
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          credentialId: 1,
          value,
        })
      );
    });

    it("should update existing cache entry", async () => {
      const repository = new CalendarCacheRepository();
      const args = {
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar-1" }],
      };

      const key = JSON.stringify({
        timeMin: args.timeMin,
        timeMax: args.timeMax,
        items: args.items,
      });

      // Create initial cache entry
      const initialData = {
        credentialId: 1,
        key,
        value: { busy: [] },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
      await prismock.calendarCache.create({ data: initialData });

      // Update with new value
      const newValue = { busy: [{ start: "2023-01-01T10:00:00Z", end: "2023-01-01T11:00:00Z" }] };
      await repository.upsertCachedAvailability({
        credentialId: 1,
        userId: 1,
        args,
        value: newValue,
      });

      const result = await prismock.calendarCache.findFirst({
        where: {
          credentialId: 1,
          key,
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          credentialId: 1,
          key,
          value: newValue,
        })
      );
    });
  });
});
