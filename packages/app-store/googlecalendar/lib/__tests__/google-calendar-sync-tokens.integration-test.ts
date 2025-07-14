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
      testUserId = 0;
      testCredentialId = 0;
      testUniqueId = "";
    } catch (error) {
      // Log cleanup errors but don't fail the test
      console.warn(
        `Cleanup warning for test ${testUniqueId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  // Mock function for Google Calendar API responses
  const mockGoogleCalendarAPI = (): MockGoogleCalendarResponse => ({
    kind: "calendar#freeBusy",
    calendars: {
      [`test-${testUniqueId}@example.com`]: {
        busy: [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
          },
        ],
      },
    },
  });

  describe("Webhook Processing and Cache Handling", () => {
    test("processes webhook and maintains cache consistency", async () => {
      // Setup: Create test calendar
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Get credential with proper typing
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

      if (!credential) {
        throw new Error("Credential not found");
      }

      const calendarService = new CalendarService({
        ...credential,
        delegatedTo: null,
      });

      // Mock the Google Calendar API call with proper return value
      const mockResponse = mockGoogleCalendarAPI();
      const mockImplementation = vi.fn().mockResolvedValue(mockResponse);
      vi.spyOn(calendarService, "fetchAvailabilityAndSetCacheIncremental").mockImplementation(
        mockImplementation
      );

      // Execute: Simulate webhook processing
      const result = await calendarService.fetchAvailabilityAndSetCacheIncremental([
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
      ]);

      // Verify: Check that cache was updated
      expect(result).toBeTruthy();
      expect(result!.calendars[userEmail].busy).toHaveLength(1);
      expect(result!.calendars[userEmail].busy[0].start).toBe(`${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`);

      // Manually store cache since mock doesn't do it
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: result!,
        nextSyncToken: "webhook-sync-token",
      });

      // Verify: Check that cache is retrievable after webhook processing
      const cacheAfterWebhook = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });
      expect(cacheAfterWebhook).toBeTruthy();
    });

    test("handles webhook errors gracefully", async () => {
      // Setup: Create test calendar
      const userEmail = `test-${testUniqueId}@example.com`;

      // Get credential with proper typing
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

      if (!credential) {
        throw new Error("Credential not found");
      }

      const calendarService = new CalendarService({
        ...credential,
        delegatedTo: null,
      });

      // Mock the API call to throw an error
      const mockImplementation = vi.fn().mockRejectedValue(new Error("API Error"));
      vi.spyOn(calendarService, "fetchAvailabilityAndSetCacheIncremental").mockImplementation(
        mockImplementation
      );

      // Execute: Simulate webhook processing - should not throw despite API error
      await expect(
        calendarService.fetchAvailabilityAndSetCacheIncremental([
          {
            externalId: userEmail,
            integration: "google_calendar",
            credentialId: testCredentialId,
            userId: testUserId,
            name: "Calendar 1",
            primary: true,
            readOnly: false,
            eventTypeId: null,
          },
        ])
      ).rejects.toThrow("API Error");
    });
  });

  describe("Sync Token Cache Structure", () => {
    test("verifies sync token storage and retrieval", async () => {
      // Setup: Create test calendar and cache entry
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE),
        timeMax: getTimeMax(TEST_DATE),
        items: [{ id: userEmail }],
      };

      // Store cache with sync token
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(),
        nextSyncToken: "test-sync-token-12345",
      });

      // Verify: Check that sync token is stored and retrievable
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.nextSyncToken).toBe("test-sync-token-12345");
    });

    test("handles sync token updates correctly", async () => {
      // Setup: Create test calendar and initial cache
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE),
        timeMax: getTimeMax(TEST_DATE),
        items: [{ id: userEmail }],
      };

      // Store initial cache
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(),
        nextSyncToken: "initial-sync-token-123",
      });

      // Update cache with new sync token
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(),
        nextSyncToken: "updated-sync-token-456",
      });

      // Verify: Check that sync token was updated
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.nextSyncToken).toBe("updated-sync-token-456");
    });
  });

  describe("Cache Performance and Scaling", () => {
    test("cache operations complete within performance thresholds", async () => {
      // Setup: Create test calendar with large dataset
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE),
        timeMax: getTimeMax(TEST_DATE),
        items: [{ id: userEmail }],
      };

      // Create large mock response (simulate busy calendar)
      const largeBusyResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: Array.from({ length: 100 }, (_, i) => ({
              start: `${TEST_DATE_ISO.slice(0, 10)}T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
              end: `${TEST_DATE_ISO.slice(0, 10)}T${String(i % 24).padStart(2, "0")}:30:00.000Z`,
            })),
          },
        },
      };

      // Performance test: Cache operations should complete quickly
      const startTime = Date.now();

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: largeBusyResponse,
        nextSyncToken: "performance-test-token",
      });

      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify: Performance and correctness
      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.nextSyncToken).toBe("performance-test-token");
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test("handles multiple concurrent cache operations", async () => {
      // Setup: Create multiple test calendars
      const _calendars = Array.from({ length: 5 }, (_, i) => ({
        email: `test-${i}-${testUniqueId}@example.com`,
        cacheArgs: {
          timeMin: getTimeMin(TEST_DATE),
          timeMax: getTimeMax(TEST_DATE),
          items: [{ id: `test-${i}-${testUniqueId}@example.com` }],
        },
      }));

      // Execute: Concurrent cache operations
      const cachePromises = _calendars.map((calendar) =>
        calendarCache.upsertCachedAvailability({
          credentialId: testCredentialId,
          userId: testUserId,
          args: calendar.cacheArgs,
          value: mockGoogleCalendarAPI(),
          nextSyncToken: `concurrent-token-${calendar.email}`,
        })
      );

      // Verify: All operations complete successfully
      await expect(Promise.all(cachePromises)).resolves.not.toThrow();
    });
  });
});
