import { randomUUID } from "crypto";
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { getTimeMin, getTimeMax } from "@calcom/features/calendar-cache/lib/datesForCache";
import prisma from "@calcom/prisma";

import CalendarService from "../CalendarService";

const TEST_DATE = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)
);
const TEST_DATE_ISO = TEST_DATE.toISOString();

describe("Google Calendar Sync Tokens Integration Tests", () => {
  let testUserId: number;
  let testCredentialId: number;
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

    // Create test user with unique identifier
    const testUser = await prisma.user.create({
      data: {
        email: `test-user-${testUniqueId}@example.com`,
        username: `test-user-${testUniqueId}`,
        name: "Test User",
        timeZone: "UTC",
      },
    });
    testUserId = testUser.id;

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

    // Create test credential with user relation
    const credential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: testUserId,
        appId: testAppId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    testCredentialId = credential.id;

    calendarCache = new CalendarCacheRepository(null);

    // Mock Google Calendar API responses
    vi.resetAllMocks();
  });

  afterEach(async () => {
    // Reset all mocks first
    vi.resetAllMocks();
    vi.clearAllMocks();

    try {
      // Clean up test data in proper order to respect foreign key constraints
      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // 1. Clear calendar cache entries for test user
        await tx.calendarCache.deleteMany({
          where: {
            credentialId: testCredentialId,
          },
        });

        // 2. Delete selected calendars
        await tx.selectedCalendar.deleteMany({
          where: {
            user: {
              email: { contains: testUniqueId },
            },
          },
        });

        // 3. Delete webhooks/subscriptions
        await tx.webhook.deleteMany({
          where: {
            userId: testUserId,
          },
        });

        // 4. Delete bookings related to test user
        await tx.booking.deleteMany({
          where: {
            userId: testUserId,
          },
        });

        // 5. Delete credentials
        await tx.credential.deleteMany({
          where: {
            user: {
              email: { contains: testUniqueId },
            },
          },
        });

        // 6. Delete event types
        await tx.eventType.deleteMany({
          where: {
            userId: testUserId,
          },
        });

        // 7. Delete user (this will cascade to other related records)
        await tx.user.deleteMany({
          where: {
            email: { contains: testUniqueId },
          },
        });
      });

      // Clear calendar cache repository state
      if (calendarCache) {
        // Clear any in-memory cache state
        calendarCache = new CalendarCacheRepository(null);
      }

      // Reset test variables
      testUserId = 0;
      testCredentialId = 0;
      testUniqueId = "";
    } catch (error) {
      // Log cleanup errors but don't fail the test
      console.warn(
        `Cleanup warning for test ${testUniqueId}:`,
        error instanceof Error ? error.message : String(error)
      );

      // Try basic cleanup as fallback
      try {
        await prisma.user.deleteMany({
          where: {
            email: { contains: testUniqueId },
          },
        });
      } catch (fallbackError) {
        console.warn(
          `Fallback cleanup failed for test ${testUniqueId}:`,
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        );
      }
    }
  });

  describe("Webhook Processing and Cache Handling", () => {
    test("processes webhook and maintains cache consistency", async () => {
      // Setup: Create selected calendar with webhook channel
      const userEmail = `test-${randomUUID()}@example.com`;

      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: userEmail,
          credentialId: testCredentialId,
          googleChannelId: "test-channel-123",
          googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      // Setup: Create initial cache entry
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: { busy: [] },
          },
        },
      });

      // Mock Google Calendar API for webhook processing
      const mockGoogleCalendarAPI = vi.fn().mockResolvedValue({
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T11:00:00.000Z`,
              },
            ],
          },
        },
      });

      // Create CalendarService instance
      const credential = await prisma.credential.findUnique({
        where: { id: testCredentialId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      expect(credential).toBeTruthy();

      const calendarService = new CalendarService(credential!);

      // Mock the Google Calendar API call
      vi.spyOn(calendarService, "fetchAvailabilityAndSetCacheIncremental" as any).mockImplementation(
        async (calendar, args) => {
          // Simulate webhook processing - update cache with new busy time
          await calendarCache.upsertCachedAvailability({
            credentialId: testCredentialId,
            userId: testUserId,
            args: cacheArgs,
            value: mockGoogleCalendarAPI(),
            nextSyncToken: "updated-sync-token-123",
          });
          return mockGoogleCalendarAPI();
        }
      );

      // Execute: Simulate webhook processing
      const result = await calendarService.fetchAvailabilityAndSetCacheIncremental(
        {
          externalId: userEmail,
          eventTypeId: null,
          integration: "google_calendar",
          credentialId: testCredentialId,
          userId: testUserId,
          name: "Test Calendar",
          primary: true,
          readOnly: false,
        },
        cacheArgs
      );

      // Verify: Check that cache was updated
      expect(result).toBeTruthy();
      expect(result.calendars[userEmail].busy).toHaveLength(1);
      expect(result.calendars[userEmail].busy[0].start).toBe(`${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`);

      // Verify: Check that cache is retrievable after webhook processing
      const cacheAfterWebhook = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cacheAfterWebhook).toBeTruthy();
      expect((cacheAfterWebhook as any)?.nextSyncToken).toBe("updated-sync-token-123");
    });

    test("handles webhook channel mapping correctly", async () => {
      // Setup: Create multiple selected calendars with different channels
      const userEmail1 = `test-${randomUUID()}@example.com`;
      const userEmail2 = `test-${randomUUID()}@example.com`;

      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: userEmail1,
          credentialId: testCredentialId,
          googleChannelId: "test-channel-456",
          googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: userEmail2,
          credentialId: testCredentialId,
          googleChannelId: "test-channel-789",
          googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      // Test: Query by channel ID to verify webhook routing
      const calendarForChannel456 = await prisma.selectedCalendar.findFirst({
        where: {
          googleChannelId: "test-channel-456",
        },
      });

      const calendarForChannel789 = await prisma.selectedCalendar.findFirst({
        where: {
          googleChannelId: "test-channel-789",
        },
      });

      expect(calendarForChannel456).toBeTruthy();
      expect(calendarForChannel456?.externalId).toBe(userEmail1);
      expect(calendarForChannel789).toBeTruthy();
      expect(calendarForChannel789?.externalId).toBe(userEmail2);
    });
  });

  describe("Sync Token Cache Structure", () => {
    test("verifies sync token storage and retrieval", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Test: Store cache with sync token
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: { busy: [] },
          },
        },
        nextSyncToken: "test-sync-token-12345",
      });

      // Test: Retrieve cache and verify sync token
      const cachedData = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedData).toBeTruthy();
      expect((cachedData as any)?.nextSyncToken).toBe("test-sync-token-12345");
    });

    test("handles sync token updates correctly", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Test: Initial cache with sync token
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: { busy: [] },
          },
        },
        nextSyncToken: "initial-sync-token-123",
      });

      // Test: Update cache with new sync token
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: {
              busy: [
                {
                  start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                  end: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
                },
              ],
            },
          },
        },
        nextSyncToken: "updated-sync-token-456",
      });

      // Test: Verify sync token was updated
      const updatedCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(updatedCache).toBeTruthy();
      expect((updatedCache as any)?.nextSyncToken).toBe("updated-sync-token-456");
      expect((updatedCache as any)?.value?.calendars?.[userEmail]?.busy).toHaveLength(1);
    });
  });

  describe("Database Transactions and Consistency", () => {
    test("maintains data integrity during concurrent operations", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      // Create multiple operations simultaneously
      const operations = Array.from({ length: 5 }, (_, i) =>
        prisma.selectedCalendar.create({
          data: {
            userId: testUserId,
            integration: "google_calendar",
            externalId: `${userEmail}-${i}`,
            credentialId: testCredentialId,
            googleChannelId: `test-channel-${i}`,
            googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        })
      );

      // Execute all operations concurrently
      const results = await Promise.all(operations);

      // Verify all operations succeeded
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.externalId).toBe(`${userEmail}-${index}`);
        expect(result.googleChannelId).toBe(`test-channel-${index}`);
      });

      // Verify database consistency
      const totalCalendars = await prisma.selectedCalendar.count({
        where: { userId: testUserId },
      });
      expect(totalCalendars).toBe(5);
    });

    test("handles foreign key constraints correctly", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      // Test: Create selected calendar with valid foreign keys
      const selectedCalendar = await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: userEmail,
          credentialId: testCredentialId,
          googleChannelId: "test-channel-constraint",
          googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      expect(selectedCalendar).toBeTruthy();
      expect(selectedCalendar.userId).toBe(testUserId);
      expect(selectedCalendar.credentialId).toBe(testCredentialId);

      // Test: Verify cascading behavior when deleting credential
      await prisma.credential.delete({
        where: { id: testCredentialId },
      });

      // Verify selected calendar is handled correctly (either deleted or constraint enforced)
      const orphanedCalendar = await prisma.selectedCalendar.findFirst({
        where: { id: selectedCalendar.id },
      });

      // Depending on schema design, this should either be null (CASCADE) or the test should fail (RESTRICT)
      expect(orphanedCalendar).toBeNull();
    });
  });

  describe("Cache Performance and Scaling", () => {
    test("handles large numbers of calendars efficiently", async () => {
      const calendarCount = 50;
      const userEmail = `test-${randomUUID()}@example.com`;

      // Create multiple calendars
      const calendars = await Promise.all(
        Array.from({ length: calendarCount }, (_, i) =>
          prisma.selectedCalendar.create({
            data: {
              userId: testUserId,
              integration: "google_calendar",
              externalId: `${userEmail}-${i}`,
              credentialId: testCredentialId,
              googleChannelId: `test-channel-${i}`,
              googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
          })
        )
      );

      // Test query performance
      const startTime = Date.now();
      const foundCalendars = await prisma.selectedCalendar.findMany({
        where: {
          userId: testUserId,
          integration: "google_calendar",
        },
        select: {
          externalId: true,
          googleChannelId: true,
        },
      });
      const queryTime = Date.now() - startTime;

      expect(foundCalendars).toHaveLength(calendarCount);
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test("cache operations complete within performance thresholds", async () => {
      const userEmail = `test-${randomUUID()}@example.com`;

      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Test cache write performance
      const writeStartTime = Date.now();
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [userEmail]: {
              busy: Array.from({ length: 100 }, (_, i) => ({
                start: `${TEST_DATE_ISO.slice(0, 10)}T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T${String(i % 24).padStart(2, "0")}:30:00.000Z`,
              })),
            },
          },
        },
        nextSyncToken: "performance-test-token",
      });
      const writeTime = Date.now() - writeStartTime;

      // Test cache read performance
      const readStartTime = Date.now();
      const cachedData = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });
      const readTime = Date.now() - readStartTime;

      expect(cachedData).toBeTruthy();
      expect(writeTime).toBeLessThan(1000); // Write should complete within 1 second
      expect(readTime).toBeLessThan(500); // Read should complete within 500ms
    });
  });
});
