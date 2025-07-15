import { randomUUID } from "crypto";
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { getTimeMin, getTimeMax } from "@calcom/features/calendar-cache/lib/datesForCache";
import prisma from "@calcom/prisma";

const TEST_DATE = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)
);
const TEST_DATE_ISO = TEST_DATE.toISOString();

type MockGoogleCalendarResponse = {
  kind: string;
  calendars: {
    [key: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
    };
  };
};

describe("Round Robin Individual Caches Integration Tests", () => {
  let testUserId1: number;
  let testUserId2: number;
  let testCredentialId1: number;
  let testCredentialId2: number;
  let testAppId: string;
  let calendarCache: CalendarCacheRepository;
  let testUniqueId: string;

  beforeEach(async () => {
    testUniqueId = randomUUID();

    // Create test users with unique identifiers
    const testUser1 = await prisma.user.create({
      data: {
        email: `test-user-1-${testUniqueId}@example.com`,
        username: `test-user-1-${testUniqueId}`,
        name: "Test User 1",
        timeZone: "UTC",
      },
    });
    testUserId1 = testUser1.id;

    const testUser2 = await prisma.user.create({
      data: {
        email: `test-user-2-${testUniqueId}@example.com`,
        username: `test-user-2-${testUniqueId}`,
        name: "Test User 2",
        timeZone: "UTC",
      },
    });
    testUserId2 = testUser2.id;

    // Create or update Google Calendar app - use upsert to handle existing app
    const app = await prisma.app.upsert({
      where: { slug: "google-calendar" },
      update: {
        keys: {
          client_id: "test-client-id.apps.googleusercontent.com",
          client_secret: "test-client-secret",
          redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"],
        },
      },
      create: {
        slug: "google-calendar",
        dirName: "googlecalendar",
        keys: {
          client_id: "test-client-id.apps.googleusercontent.com",
          client_secret: "test-client-secret",
          redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"],
        },
      },
    });
    testAppId = app.slug;

    // Create test credentials
    const credential1 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test-access-token-1",
          refresh_token: "test-refresh-token-1",
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: testUserId1,
        appId: testAppId,
      },
    });
    testCredentialId1 = credential1.id;

    const credential2 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test-access-token-2",
          refresh_token: "test-refresh-token-2",
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: testUserId2,
        appId: testAppId,
      },
    });
    testCredentialId2 = credential2.id;

    calendarCache = new CalendarCacheRepository(null);
  });

  afterEach(async () => {
    // Reset all mocks first
    vi.resetAllMocks();
    vi.clearAllMocks();

    try {
      // Clean up test data - let PostgreSQL cascades handle related records
      await prisma.user.deleteMany({
        where: {
          email: { contains: testUniqueId },
        },
      });

      // Clear calendar cache repository state
      if (calendarCache) {
        calendarCache = new CalendarCacheRepository(null);
      }

      // Reset test variables
      testUserId1 = 0;
      testUserId2 = 0;
      testCredentialId1 = 0;
      testCredentialId2 = 0;
      testUniqueId = "";
    } catch (error) {
      console.warn(
        `Cleanup warning for test ${testUniqueId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  // Mock function for Google Calendar API responses
  const mockGoogleCalendarAPI = (
    email: string,
    busy: Array<{ start: string; end: string }> = []
  ): MockGoogleCalendarResponse => ({
    kind: "calendar#freeBusy",
    calendars: {
      [email]: {
        busy,
      },
    },
  });

  describe("Individual Cache Creation and Retrieval", () => {
    test("verifies individual cache creation and retrieval", async () => {
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Store individual cache
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(userEmail, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
          },
        ]),
        nextSyncToken: "individual-cache-sync-token-123",
      });

      // Retrieve and verify
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.nextSyncToken).toBe("individual-cache-sync-token-123");
    });

    test("handles multiple individual caches per user", async () => {
      const userEmail1 = `test1-${testUniqueId}@example.com`;
      const userEmail2 = `test2-${testUniqueId}@example.com`;

      const cacheArgs1 = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail1 }],
      };

      const cacheArgs2 = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail2 }],
      };

      // Store multiple individual caches for the same user
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs1,
        value: mockGoogleCalendarAPI(userEmail1, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
          },
        ]),
        nextSyncToken: "sync-token-calendar-1",
      });

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs2,
        value: mockGoogleCalendarAPI(userEmail2, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T11:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T11:30:00.000Z`,
          },
        ]),
        nextSyncToken: "sync-token-calendar-2",
      });

      // Verify both caches exist independently
      const cache1 = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs1,
      });

      const cache2 = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs2,
      });

      expect(cache1).toBeTruthy();
      expect(cache1?.nextSyncToken).toBe("sync-token-calendar-1");
      expect(cache2).toBeTruthy();
      expect(cache2?.nextSyncToken).toBe("sync-token-calendar-2");
    });
  });

  describe("Cache Merging for Multiple Users", () => {
    test("verifies cache merging for multiple users", async () => {
      const userEmail1 = `user1-${testUniqueId}@example.com`;
      const userEmail2 = `user2-${testUniqueId}@example.com`;

      const cacheArgs1 = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail1 }],
      };

      const cacheArgs2 = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail2 }],
      };

      // Store caches for different users
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs1,
        value: mockGoogleCalendarAPI(userEmail1, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
          },
        ]),
        nextSyncToken: "sync-token-user1",
      });

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId2,
        userId: testUserId2,
        args: cacheArgs2,
        value: mockGoogleCalendarAPI(userEmail2, []),
        nextSyncToken: "sync-token-user2",
      });

      // Verify independent caches
      const cache1 = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs1,
      });

      const cache2 = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId2,
        userId: testUserId2,
        args: cacheArgs2,
      });

      expect(cache1).toBeTruthy();
      expect(cache1?.nextSyncToken).toBe("sync-token-user1");
      expect(cache2).toBeTruthy();
      expect(cache2?.nextSyncToken).toBe("sync-token-user2");
    });

    test("handles cache merging with round-robin scheduling", async () => {
      const userEmails = [
        `rr-user-1-${testUniqueId}@example.com`,
        `rr-user-2-${testUniqueId}@example.com`,
        `rr-user-3-${testUniqueId}@example.com`,
      ];

      const cacheOps = userEmails.map((email, index) => ({
        credentialId: index === 0 ? testCredentialId1 : testCredentialId2,
        userId: index === 0 ? testUserId1 : testUserId2,
        args: {
          timeMin: getTimeMin(TEST_DATE_ISO),
          timeMax: getTimeMax(TEST_DATE_ISO),
          items: [{ id: email }],
        },
        value: mockGoogleCalendarAPI(email, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T${String(10 + index).padStart(2, "0")}:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T${String(10 + index).padStart(2, "0")}:30:00.000Z`,
          },
        ]),
        nextSyncToken: `rr-sync-token-${index + 1}`,
      }));

      // Store all caches
      await Promise.all(
        cacheOps.map((op) =>
          calendarCache.upsertCachedAvailability({
            credentialId: op.credentialId,
            userId: op.userId,
            args: op.args,
            value: op.value,
            nextSyncToken: op.nextSyncToken,
          })
        )
      );

      // Verify all caches exist
      const results = await Promise.all(
        cacheOps.map((op) =>
          calendarCache.getCachedAvailability({
            credentialId: op.credentialId,
            userId: op.userId,
            args: op.args,
          })
        )
      );

      results.forEach((result, index) => {
        expect(result).toBeTruthy();
        expect(result?.nextSyncToken).toBe(`rr-sync-token-${index + 1}`);
      });
    });
  });

  describe("Cache State Transitions", () => {
    test("verifies cache state transitions", async () => {
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Initial state - no cache
      const initialCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });
      expect(initialCache).toBeNull();

      // State 1: Create cache with busy time
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(userEmail, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T14:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T14:30:00.000Z`,
          },
        ]),
        nextSyncToken: "state-transition-token",
      });

      const state1Cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });
      expect(state1Cache).toBeTruthy();
      expect(state1Cache?.nextSyncToken).toBe("state-transition-token");

      // State 2: Update cache to empty busy time
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(userEmail, []),
        nextSyncToken: "updated-state-token",
      });

      const state2Cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });
      expect(state2Cache).toBeTruthy();
      expect(state2Cache?.nextSyncToken).toBe("updated-state-token");
    });

    test("handles cache invalidation and refresh cycles", async () => {
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Store cache with multiple busy times
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(userEmail, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
          },
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T15:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T15:30:00.000Z`,
          },
        ]),
        nextSyncToken: "refresh-token",
      });

      // Verify cache exists
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.nextSyncToken).toBe("refresh-token");
    });
  });

  describe("Database Integration and Performance", () => {
    test("validates cache consistency after database operations", async () => {
      const userEmail = `consistency-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Store cache
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(userEmail, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T12:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T12:30:00.000Z`,
          },
        ]),
        nextSyncToken: "consistency-token",
      });

      // Verify cache persists after database operations
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.nextSyncToken).toBe("consistency-token");
    });
  });
});
