import { randomUUID } from "crypto";
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { getTimeMin, getTimeMax } from "@calcom/features/calendar-cache/lib/datesForCache";
import prisma from "@calcom/prisma";

const TEST_DATE = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)
);
const TEST_DATE_ISO = TEST_DATE.toISOString();

describe("Round Robin Individual Caches Integration Tests", () => {
  let testUserId1: number;
  let testUserId2: number;
  let testCredentialId1: number;
  let testCredentialId2: number;
  let testAppId: string;
  let calendarCache: CalendarCacheRepository;
  let testUniqueId: string;

  beforeEach(async () => {
    // Generate unique test ID for isolation
    testUniqueId = randomUUID();

    // Don't delete seeded data - only clean up specific test records
    await prisma.selectedCalendar.deleteMany({
      where: {
        user: {
          email: { contains: testUniqueId },
        },
      },
    });
    await prisma.credential.deleteMany({
      where: {
        user: {
          email: { contains: testUniqueId },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { contains: testUniqueId },
      },
    });

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

    // Mock Google Calendar API responses
    vi.resetAllMocks();
  });

  afterEach(async () => {
    // Clean up only the test records we created
    await prisma.selectedCalendar.deleteMany({
      where: {
        user: {
          email: { contains: testUniqueId },
        },
      },
    });
    await prisma.credential.deleteMany({
      where: {
        user: {
          email: { contains: testUniqueId },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { contains: testUniqueId },
      },
    });
    // Don't delete the google-calendar app as it's shared across tests
  });

  describe("Individual Cache Creation and Retrieval", () => {
    test("verifies individual cache creation and retrieval", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Test: Initial cache should be empty
      const initialCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(initialCache).toBeNull();

      // Test: Create cache with sync token
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "individual-cache-sync-token-123",
      });

      // Test: Retrieve cache and verify
      const cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(cache).toBeTruthy();
      expect((cache as any)?.nextSyncToken).toBe("individual-cache-sync-token-123");
      expect((cache as any)?.value?.calendars[userEmail].busy).toHaveLength(1);
      expect((cache as any)?.value?.calendars[userEmail].busy[0].start).toBe(
        `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`
      );
    });

    test("handles multiple individual caches per user", async () => {
      const userEmail1 = `test1-${randomUUID()}@example.com`;
      const userEmail2 = `test2-${randomUUID()}@example.com`;

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

      // Test: Create multiple individual caches for the same user
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs1,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail1]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "sync-token-calendar-1",
      });

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs2,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail2]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T11:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T11:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "sync-token-calendar-2",
      });

      // Test: Retrieve both caches independently
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
      expect(cache2).toBeTruthy();
      expect((cache1 as any)?.nextSyncToken).toBe("sync-token-calendar-1");
      expect((cache2 as any)?.nextSyncToken).toBe("sync-token-calendar-2");
      expect((cache1 as any)?.value?.calendars[userEmail1].busy).toHaveLength(1);
      expect((cache2 as any)?.value?.calendars[userEmail2].busy).toHaveLength(1);
    });
  });

  describe("Cache Merging for Multiple Users", () => {
    test("verifies cache merging for multiple users", async () => {
      const userEmail1 = `user1-${randomUUID()}@example.com`;
      const userEmail2 = `user2-${randomUUID()}@example.com`;

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

      // Test: Create separate caches for different users
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs1,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail1]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "sync-token-user1",
      });

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId2,
        userId: testUserId2,
        args: cacheArgs2,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail2]: {
              busy: [],
            },
          },
        },
        nextSyncToken: "sync-token-user2",
      });

      // Test: Retrieve both caches independently
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
      expect(cache2).toBeTruthy();
      expect((cache1 as any)?.nextSyncToken).toBe("sync-token-user1");
      expect((cache2 as any)?.nextSyncToken).toBe("sync-token-user2");
      expect((cache1 as any)?.value?.calendars[userEmail1].busy).toHaveLength(1);
      expect((cache2 as any)?.value?.calendars[userEmail2].busy).toHaveLength(0);
    });

    test("handles cache merging with round-robin scheduling", async () => {
      // Setup: Create multiple users for round-robin scenario
      const users = await Promise.all([
        prisma.user.create({
          data: {
            email: `rr-user-1-${randomUUID()}@example.com`,
            username: `rr-user-1-${randomUUID()}`,
            name: "Round Robin User 1",
            timeZone: "UTC",
          },
        }),
        prisma.user.create({
          data: {
            email: `rr-user-2-${randomUUID()}@example.com`,
            username: `rr-user-2-${randomUUID()}`,
            name: "Round Robin User 2",
            timeZone: "UTC",
          },
        }),
        prisma.user.create({
          data: {
            email: `rr-user-3-${randomUUID()}@example.com`,
            username: `rr-user-3-${randomUUID()}`,
            name: "Round Robin User 3",
            timeZone: "UTC",
          },
        }),
      ]);

      // Create credentials for each user
      const credentials = await Promise.all(
        users.map((user, index) =>
          prisma.credential.create({
            data: {
              type: "google_calendar",
              key: {
                access_token: `test-access-token-${index + 1}`,
                refresh_token: `test-refresh-token-${index + 1}`,
                scope: "https://www.googleapis.com/auth/calendar",
                token_type: "Bearer",
                expiry_date: Date.now() + 3600000,
              },
              userId: user.id,
              appId: testAppId,
            },
          })
        )
      );

      // Create individual caches for each user
      const cacheOperations = users.map((user, index) => {
        const cacheArgs = {
          timeMin: getTimeMin(TEST_DATE_ISO),
          timeMax: getTimeMax(TEST_DATE_ISO),
          items: [{ id: user.email! }],
        };

        return calendarCache.upsertCachedAvailability({
          credentialId: credentials[index].id,
          userId: user.id,
          args: cacheArgs,
          value: {
            kind: "calendar#freeBusy",
            calendars: {
              [user.email!]: {
                busy: [
                  {
                    start: `${TEST_DATE_ISO.slice(0, 10)}T${String(10 + index).padStart(2, "0")}:00:00.000Z`,
                    end: `${TEST_DATE_ISO.slice(0, 10)}T${String(10 + index).padStart(2, "0")}:30:00.000Z`,
                  },
                ],
              },
            },
          },
          nextSyncToken: `rr-sync-token-${index + 1}`,
        });
      });

      await Promise.all(cacheOperations);

      // Test: Retrieve all caches and verify they're independent
      const caches = await Promise.all(
        users.map((user, index) => {
          const cacheArgs = {
            timeMin: getTimeMin(TEST_DATE_ISO),
            timeMax: getTimeMax(TEST_DATE_ISO),
            items: [{ id: user.email! }],
          };

          return calendarCache.getCachedAvailability({
            credentialId: credentials[index].id,
            userId: user.id,
            args: cacheArgs,
          });
        })
      );

      // Verify each cache exists and has correct data
      caches.forEach((cache, index) => {
        expect(cache).toBeTruthy();
        expect((cache as any)?.nextSyncToken).toBe(`rr-sync-token-${index + 1}`);
        expect((cache as any)?.value?.calendars[users[index].email!].busy).toHaveLength(1);
      });
    });
  });

  describe("Cache State Transitions", () => {
    test("verifies cache state transitions", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Test: Initial state - cache should be empty
      const emptyCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });
      expect(emptyCache).toBeNull();

      // Test: Transition to populated state
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T14:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T14:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "state-transition-token",
      });

      const populatedCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(populatedCache).toBeTruthy();
      expect((populatedCache as any)?.nextSyncToken).toBe("state-transition-token");
      expect((populatedCache as any)?.value?.calendars[userEmail].busy).toHaveLength(1);

      // Test: Transition to updated state
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: { busy: [] },
          },
        },
        nextSyncToken: "updated-state-token",
      });

      const updatedCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(updatedCache).toBeTruthy();
      expect((updatedCache as any)?.nextSyncToken).toBe("updated-state-token");
      expect((updatedCache as any)?.value?.calendars[userEmail].busy).toHaveLength(0);
    });

    test("handles cache invalidation and refresh cycles", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Test: Create initial cache
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "initial-token",
      });

      // Test: Simulate cache refresh with new data
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
                },
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T15:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T15:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "refresh-token",
      });

      const refreshedCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(refreshedCache).toBeTruthy();
      expect((refreshedCache as any)?.nextSyncToken).toBe("refresh-token");
      expect((refreshedCache as any)?.value?.calendars[userEmail].busy).toHaveLength(2);
    });
  });

  describe("Database Integration and Performance", () => {
    test("handles concurrent cache operations across multiple users", async () => {
      const userCount = 10;
      const operations = [];

      // Create multiple users and concurrent cache operations
      for (let i = 0; i < userCount; i++) {
        const user = await prisma.user.create({
          data: {
            email: `concurrent-user-${i}-${randomUUID()}@example.com`,
            username: `concurrent-user-${i}-${randomUUID()}`,
            name: `Concurrent User ${i}`,
            timeZone: "UTC",
          },
        });

        const credential = await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: {
              access_token: `test-access-token-${i}`,
              refresh_token: `test-refresh-token-${i}`,
              scope: "https://www.googleapis.com/auth/calendar",
              token_type: "Bearer",
              expiry_date: Date.now() + 3600000,
            },
            userId: user.id,
            appId: testAppId,
          },
        });

        const cacheArgs = {
          timeMin: getTimeMin(TEST_DATE_ISO),
          timeMax: getTimeMax(TEST_DATE_ISO),
          items: [{ id: user.email! }],
        };

        operations.push(
          calendarCache.upsertCachedAvailability({
            credentialId: credential.id,
            userId: user.id,
            args: cacheArgs,
            value: {
              kind: "calendar#freeBusy",
              calendars: {
                [user.email!]: {
                  busy: [
                    {
                      start: `${TEST_DATE_ISO.slice(0, 10)}T${String(9 + i).padStart(2, "0")}:00:00.000Z`,
                      end: `${TEST_DATE_ISO.slice(0, 10)}T${String(9 + i).padStart(2, "0")}:30:00.000Z`,
                    },
                  ],
                },
              },
            },
            nextSyncToken: `concurrent-token-${i}`,
          })
        );
      }

      // Execute all operations concurrently
      const startTime = Date.now();
      await Promise.all(operations);
      const executionTime = Date.now() - startTime;

      // Verify performance threshold
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test("validates cache consistency after database operations", async () => {
      const userEmail = `consistency-${randomUUID()}@example.com`;

      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Test: Create cache and verify consistency
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T12:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T12:30:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "consistency-token",
      });

      // Verify cache exists and has correct data
      const cachedData = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId1,
        userId: testUserId1,
        args: cacheArgs,
      });

      expect(cachedData).toBeTruthy();
      expect((cachedData as any)?.nextSyncToken).toBe("consistency-token");
      expect((cachedData as any)?.value?.calendars[userEmail].busy).toHaveLength(1);
      expect((cachedData as any)?.value?.calendars[userEmail].busy[0].start).toBe(
        `${TEST_DATE_ISO.slice(0, 10)}T12:00:00.000Z`
      );
    });
  });
});
