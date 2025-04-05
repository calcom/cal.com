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

  describe("findUnexpiredUnique", () => {
    it("should find cached data for regular credential", async () => {
      const repository = new CalendarCacheRepository();
      const testData = {
        credentialId: 1,
        userId: 1,
        key: "test-key",
        value: { data: "test" },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      };

      await prismock.calendarCache.create({ data: testData });

      const result = await repository.findUnexpiredUnique({
        credentialId: 1,
        delegationCredentialId: null,
        userId: 1,
        key: "test-key",
      });

      expect(result).toEqual(
        expect.objectContaining({
          credentialId: testData.credentialId,
          key: testData.key,
          value: testData.value,
        })
      );
    });

    it("should find cached data for delegation credential", async () => {
      const repository = new CalendarCacheRepository();
      const testData = {
        delegationCredentialId: "delegation-123",
        userId: 1,
        key: "test-key",
        value: { data: "test" },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      };

      await prismock.calendarCache.create({ data: testData });

      const result = await repository.findUnexpiredUnique({
        credentialId: null,
        delegationCredentialId: "delegation-123",
        userId: 1,
        key: "test-key",
      });

      expect(result).toEqual(
        expect.objectContaining({
          delegationCredentialId: testData.delegationCredentialId,
          key: testData.key,
          value: testData.value,
        })
      );
    });

    it("should return null for expired cache", async () => {
      const repository = new CalendarCacheRepository();
      const testData = {
        credentialId: 1,
        userId: 1,
        key: "test-key",
        value: { data: "test" },
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      await prismock.calendarCache.create({ data: testData });

      const result = await repository.findUnexpiredUnique({
        credentialId: 1,
        delegationCredentialId: null,
        userId: 1,
        key: "test-key",
      });

      expect(result).toBeNull();
    });
  });

  // It needs to consider parseKeyForCache being called
  // eslint-disable-next-line playwright/no-skipped-test
  describe.skip("getCachedAvailability", () => {
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
        delegationCredentialId: null,
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
  });

  describe("upsertCachedAvailability(mocks min and max time fns)", () => {
    describe("when credential is a regular credential", () => {
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
          delegationCredentialId: null,
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
          delegationCredentialId: null,
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

    describe("when credential is a delegation credential", () => {
      it("should create new cache entry when none exists", async () => {
        const repository = new CalendarCacheRepository();
        const args = {
          timeMin: "2023-01-01T00:00:00Z",
          timeMax: "2023-01-02T00:00:00Z",
          items: [{ id: "calendar-1" }],
        };
        const value = { busy: [] };

        await repository.upsertCachedAvailability({
          credentialId: null,
          delegationCredentialId: "delegation-123",
          userId: 1,
          args,
          value,
        });

        const result = await prismock.calendarCache.findFirst({
          where: {
            delegationCredentialId: "delegation-123",
          },
        });
      });

      it("should update existing cache entry as long as delegationCredentialId and userId match", async () => {
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

        const initialData = {
          delegationCredentialId: "delegation-123",
          key,
          userId: 1,
          value: { busy: [] },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        await prismock.calendarCache.create({ data: initialData });

        const newValue = { busy: [{ start: "2023-01-01T10:00:00Z", end: "2023-01-01T11:00:00Z" }] };
        await repository.upsertCachedAvailability({
          credentialId: null,
          delegationCredentialId: "delegation-123",
          userId: 1,
          args,
          value: newValue,
        });

        const result = await prismock.calendarCache.findFirst({
          where: {
            delegationCredentialId: "delegation-123",
          },
        });

        expect(result).toEqual(
          expect.objectContaining({
            value: newValue,
          })
        );
      });

      it("should create new cache entry if delegationCredentialId is same but userId is different", async () => {
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

        const userId1 = 1;
        const userId2 = 2;
        const initialData = {
          delegationCredentialId: "delegation-123",
          key,
          userId: userId1,
          value: { busy: [] },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        await prismock.calendarCache.create({ data: initialData });

        const newValue = { busy: [{ start: "2023-01-01T10:00:00Z", end: "2023-01-01T11:00:00Z" }] };
        await repository.upsertCachedAvailability({
          credentialId: null,
          delegationCredentialId: "delegation-123",
          userId: userId2,
          args,
          value: newValue,
        });

        const result = await prismock.calendarCache.findMany({
          where: {
            delegationCredentialId: "delegation-123",
          },
        });

        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              userId: userId2,
              value: newValue,
            }),
            expect.objectContaining({
              userId: userId1,
              value: initialData.value,
            }),
          ])
        );
      });
    });
  });

  describe("deleteManyByCredential", () => {
    it("should delete all cache entries for a regular credential", async () => {
      const repository = new CalendarCacheRepository();
      // Create test data
      await prismock.calendarCache.createMany({
        data: [
          {
            credentialId: 1,
            key: "key-1",
            value: { data: "test-1" },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          {
            credentialId: 1,
            key: "key-2",
            value: { data: "test-2" },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        ],
      });

      await repository.deleteManyByCredential({
        credentialId: 1,
        delegationCredentialId: null,
        userId: null,
      });

      const remainingEntries = await prismock.calendarCache.findMany({
        where: {
          credentialId: 1,
        },
      });

      expect(remainingEntries).toHaveLength(0);
    });

    it("should delete all cache entries for a delegation credential", async () => {
      const repository = new CalendarCacheRepository();
      const userId1 = 1;
      const userId2 = 2;
      // Create test data
      await prismock.calendarCache.createMany({
        data: [
          {
            delegationCredentialId: "delegation-123",
            userId: userId1,
            key: "key-1",
            value: { data: "test-1" },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          {
            delegationCredentialId: "delegation-123",
            userId: userId1,
            key: "key-2",
            value: { data: "test-2" },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          {
            delegationCredentialId: "delegation-123",
            userId: userId2,
            key: "key-3",
            value: { data: "test-3" },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        ],
      });

      await repository.deleteManyByCredential({
        credentialId: null,
        delegationCredentialId: "delegation-123",
        userId: userId1,
      });

      const remainingEntries = await prismock.calendarCache.findMany({
        where: {
          delegationCredentialId: "delegation-123",
          userId: userId1,
        },
      });

      expect(remainingEntries).toHaveLength(0);

      const remainingEntries2 = await prismock.calendarCache.findMany({
        where: {
          delegationCredentialId: "delegation-123",
          userId: userId2,
        },
      });
      expect(remainingEntries2).toHaveLength(1);
    });
  });
});
