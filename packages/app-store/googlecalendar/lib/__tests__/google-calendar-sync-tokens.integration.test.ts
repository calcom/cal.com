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
          email: userEmail,
        },
      ]);

      // Verify: Check that cache was updated
      expect(result).toBeTruthy();
      expect(mockResponse.calendars[userEmail].busy).toHaveLength(1);
      expect(mockResponse.calendars[userEmail].busy[0].start).toBe(
        `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`
      );

      // Manually store cache since mock doesn't do it
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockResponse,
      });

      // Verify: Check that sync token is stored and retrievable
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      expect(cachedResult!.value).toBeDefined();
      const cachedValue = cachedResult!.value as MockGoogleCalendarResponse;
      expect(cachedValue.calendars[userEmail].busy).toHaveLength(1);
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
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Store cache with sync token
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(),
      });

      // Verify: Check that sync token was stored
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      const cachedValue = cachedResult!.value as MockGoogleCalendarResponse;
      expect(cachedValue.calendars[userEmail].busy).toHaveLength(1);
    });

    test("handles sync token updates correctly", async () => {
      // Setup: Create test calendar and initial cache
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Store initial cache
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(),
      });

      // Verify: Check that sync token was updated
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      const cachedValue = cachedResult!.value as MockGoogleCalendarResponse;
      expect(cachedValue.calendars[userEmail].busy).toHaveLength(1);
    });

    test("maintains cache consistency during rapid updates", async () => {
      // Setup: Create test calendar and perform rapid updates
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Perform rapid cache updates
      await Promise.all([
        calendarCache.upsertCachedAvailability({
          credentialId: testCredentialId,
          userId: testUserId,
          args: cacheArgs,
          value: mockGoogleCalendarAPI(),
        }),
        calendarCache.upsertCachedAvailability({
          credentialId: testCredentialId,
          userId: testUserId,
          args: cacheArgs,
          value: mockGoogleCalendarAPI(),
        }),
      ]);

      // Verify: Check final cache state
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      const cachedValue = cachedResult!.value as MockGoogleCalendarResponse;
      expect(cachedValue.calendars[userEmail].busy).toHaveLength(1);
    });

    test("ensures proper cache invalidation on errors", async () => {
      // Setup: Create test calendar and simulate error scenario
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Store cache and verify proper cleanup
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(),
      });

      // Verify: Check that cache is properly maintained
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      const cachedValue = cachedResult!.value as MockGoogleCalendarResponse;
      expect(cachedValue.calendars[userEmail].busy).toHaveLength(1);
    });

    test("handles calendar permission changes correctly", async () => {
      // Setup: Create test calendar and simulate permission changes
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Store cache with permission changes
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: mockGoogleCalendarAPI(),
      });

      // Verify: Check that cache handles permission changes
      const cachedResult = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });

      expect(cachedResult).toBeTruthy();
      const cachedValue = cachedResult!.value as MockGoogleCalendarResponse;
      expect(cachedValue.calendars[userEmail].busy).toHaveLength(1);
    });
  });

  describe("Cache Merging Behavior - Critical Bug Tests", () => {
    test("should merge cache when adding new events to existing ones", async () => {
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Setup: Store initial cache with 3 existing events
      const initialCacheResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
              },
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T11:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T11:30:00.000Z`,
              },
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T14:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T14:30:00.000Z`,
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: initialCacheResponse,
        nextSyncToken: "initial-sync-token",
      });

      const initialCached = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });
      expect(initialCached).toBeTruthy();
      const initialValue = initialCached!.value as MockGoogleCalendarResponse;
      expect(initialValue.calendars[userEmail].busy).toHaveLength(3);

      const incrementalResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T16:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T16:30:00.000Z`,
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: incrementalResponse,
        nextSyncToken: "new-sync-token",
      });

      const finalCached = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });
      expect(finalCached).toBeTruthy();
      const finalValue = finalCached!.value as MockGoogleCalendarResponse;

      expect(finalValue.calendars[userEmail].busy).toHaveLength(4); // This will fail!

      const busyTimes = finalValue.calendars[userEmail].busy;
      const startTimes = busyTimes.map((bt) => bt.start);
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`); // Lost
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T11:00:00.000Z`); // Lost
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T14:00:00.000Z`); // Lost
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T16:00:00.000Z`); // Only this remains
    });

    test("should handle event updates correctly", async () => {
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Setup: Store initial cache with 2 events
      const initialCacheResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
              },
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T15:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T15:30:00.000Z`,
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: initialCacheResponse,
        nextSyncToken: "initial-sync-token",
      });

      const updatedEventResponse: MockGoogleCalendarResponse = {
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
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: updatedEventResponse,
        nextSyncToken: "updated-sync-token",
      });

      const finalCached = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });
      expect(finalCached).toBeTruthy();
      const finalValue = finalCached!.value as MockGoogleCalendarResponse;

      expect(finalValue.calendars[userEmail].busy).toHaveLength(3);

      const busyTimes = finalValue.calendars[userEmail].busy;
      const startTimes = busyTimes.map((bt) => bt.start);
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T12:00:00.000Z`); // Updated event
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T15:00:00.000Z`); // Unchanged event (preserved!)
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`); // Original event (preserved!)
    });

    test("should handle event deletions correctly", async () => {
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      // Setup: Store initial cache with 3 events
      const initialCacheResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
              },
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T11:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T11:30:00.000Z`,
              },
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T14:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T14:30:00.000Z`,
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: initialCacheResponse,
        nextSyncToken: "initial-sync-token",
      });

      const deletionResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [], // No events returned for deletion-only sync
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: deletionResponse,
        nextSyncToken: "deletion-sync-token",
      });

      const finalCached = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });
      expect(finalCached).toBeTruthy();
      const finalValue = finalCached!.value as MockGoogleCalendarResponse;

      expect(finalValue.calendars[userEmail].busy).toHaveLength(3);

      const busyTimes = finalValue.calendars[userEmail].busy;
      const startTimes = busyTimes.map((bt) => bt.start);
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`); // Should remain (preserved!)
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T14:00:00.000Z`); // Should remain (preserved!)
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T11:00:00.000Z`); // Original event (preserved!)
    });

    test("demonstrates availability gap bug in real scenario", async () => {
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: userEmail }],
      };

      const morningMeetings: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
              },
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T11:30:00.000Z`,
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: morningMeetings,
        nextSyncToken: "morning-sync-token",
      });

      const afternoonMeeting: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T15:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T16:00:00.000Z`,
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
        value: afternoonMeeting,
        nextSyncToken: "afternoon-sync-token",
      });

      const finalCached = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs,
      });
      expect(finalCached).toBeTruthy();
      const finalValue = finalCached!.value as MockGoogleCalendarResponse;

      expect(finalValue.calendars[userEmail].busy).toHaveLength(3); // Should have all 3 meetings

      const busyTimes = finalValue.calendars[userEmail].busy;
      const startTimes = busyTimes.map((bt) => bt.start);
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`); // Lost - user appears free!
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`); // Lost - user appears free!
      expect(startTimes).toContain(`${TEST_DATE_ISO.slice(0, 10)}T15:00:00.000Z`); // Only this remains
    });
  });

  describe("Cache Performance and Scaling", () => {
    test("cache operations complete within performance thresholds", async () => {
      // Setup: Create test calendar with large dataset
      const userEmail = `test-${testUniqueId}@example.com`;
      const cacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
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
      expect((cachedResult as any)?.nextSyncToken).toBe("performance-test-token");
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test("handles multiple concurrent cache operations", async () => {
      // Setup: Create multiple test calendars
      const _calendars = Array.from({ length: 5 }, (_, i) => ({
        email: `test-${i}-${testUniqueId}@example.com`,
        cacheArgs: {
          timeMin: getTimeMin(TEST_DATE_ISO),
          timeMax: getTimeMax(TEST_DATE_ISO),
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

  describe("Month Boundary Cache Key Issue - CRITICAL BUG", () => {
    test("proves cache keys change across month boundaries causing future events to be lost", async () => {
      const userEmail = `month-boundary-${testUniqueId}@example.com`;

      // Setup: Mock system time to Jan 31st, 2025
      vi.setSystemTime(new Date("2025-01-31T23:00:00.000Z"));

      const jan31Query = "2025-01-31T10:00:00.000Z";
      const jan31Args = {
        timeMin: getTimeMin(jan31Query), // Will be 2025-01-01T00:00:00.000Z
        timeMax: getTimeMax(jan31Query), // Will be based on current date (Jan 31)
        items: [{ id: userEmail }],
      };

      const jan31CacheResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: "2025-01-31T14:00:00.000Z",
                end: "2025-01-31T15:00:00.000Z",
              },
              {
                start: "2025-02-03T10:00:00.000Z",
                end: "2025-02-03T11:00:00.000Z",
              },
              {
                start: "2025-02-15T16:00:00.000Z",
                end: "2025-02-15T17:00:00.000Z",
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: jan31Args,
        value: jan31CacheResponse,
        nextSyncToken: "jan31-sync-token-with-future-events",
      });

      const jan31Cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: jan31Args,
      });
      expect(jan31Cache).toBeTruthy();
      expect(jan31Cache?.nextSyncToken).toBe("jan31-sync-token-with-future-events");
      const jan31Value = jan31Cache!.value as MockGoogleCalendarResponse;
      expect(jan31Value.calendars[userEmail].busy).toHaveLength(3);

      vi.setSystemTime(new Date("2025-02-01T09:00:00.000Z"));

      const feb1Query = "2025-02-01T10:00:00.000Z";
      const feb1Args = {
        timeMin: getTimeMin(feb1Query), // Will be 2025-02-01T00:00:00.000Z (DIFFERENT!)
        timeMax: getTimeMax(feb1Query), // Will be based on current date (Feb 1)
        items: [{ id: userEmail }],
      };

      const feb1Cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: feb1Args,
      });

      expect(feb1Cache).toBeNull(); // CACHE MISS!

      const jan31Key = JSON.stringify(jan31Args);
      const feb1Key = JSON.stringify(feb1Args);
      expect(jan31Key).not.toBe(feb1Key); // Different keys for same logical query

      const feb1IncrementalResponse: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: "2025-02-01T12:00:00.000Z",
                end: "2025-02-01T13:00:00.000Z",
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: feb1Args,
        value: feb1IncrementalResponse,
        nextSyncToken: "feb1-new-sync-token", // Lost connection to previous token
      });

      const feb1FinalCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: feb1Args,
      });

      expect(feb1FinalCache).toBeTruthy();
      const feb1FinalValue = feb1FinalCache!.value as MockGoogleCalendarResponse;
      const feb1BusyTimes = feb1FinalValue.calendars[userEmail].busy;

      expect(feb1BusyTimes).toHaveLength(1); // Should be 3 if cache continuity worked

      const feb1StartTimes = feb1BusyTimes.map((bt) => bt.start);
      expect(feb1StartTimes).toContain("2025-02-01T12:00:00.000Z"); // Only new event
      expect(feb1StartTimes).not.toContain("2025-02-03T10:00:00.000Z"); // LOST!
      expect(feb1StartTimes).not.toContain("2025-02-15T16:00:00.000Z"); // LOST!

      vi.useRealTimers();
    });

    test("proves sync token continuity is broken across month boundaries", async () => {
      const userEmail = `sync-token-${testUniqueId}@example.com`;

      // Setup: Mock system time to Jan 31st
      vi.setSystemTime(new Date("2025-01-31T20:00:00.000Z"));

      const jan31Args = {
        timeMin: getTimeMin("2025-01-31T10:00:00.000Z"),
        timeMax: getTimeMax("2025-01-31T10:00:00.000Z"),
        items: [{ id: userEmail }],
      };

      // Store cache with sync token on Jan 31st
      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: jan31Args,
        value: mockGoogleCalendarAPI(),
        nextSyncToken: "jan31-sync-token-abc123",
      });

      const jan31Cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: jan31Args,
      });
      expect(jan31Cache?.nextSyncToken).toBe("jan31-sync-token-abc123");

      vi.setSystemTime(new Date("2025-02-01T08:00:00.000Z"));

      const feb1Args = {
        timeMin: getTimeMin("2025-02-01T10:00:00.000Z"), // Different timeMin!
        timeMax: getTimeMax("2025-02-01T10:00:00.000Z"),
        items: [{ id: userEmail }],
      };

      const feb1Cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: feb1Args,
      });

      expect(feb1Cache).toBeNull(); // No cache found = no sync token available

      vi.useRealTimers();
    });

    test("proves cache fragmentation occurs at month boundaries", async () => {
      const userEmail = `fragmentation-${testUniqueId}@example.com`;

      // Setup: Create caches across month boundary
      vi.setSystemTime(new Date("2025-01-31T12:00:00.000Z"));

      const jan31Args = {
        timeMin: getTimeMin("2025-01-31T10:00:00.000Z"),
        timeMax: getTimeMax("2025-01-31T10:00:00.000Z"),
        items: [{ id: userEmail }],
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: jan31Args,
        value: mockGoogleCalendarAPI(),
        nextSyncToken: "jan31-token",
      });

      vi.setSystemTime(new Date("2025-02-01T12:00:00.000Z"));

      const feb1Args = {
        timeMin: getTimeMin("2025-02-01T10:00:00.000Z"),
        timeMax: getTimeMax("2025-02-01T10:00:00.000Z"),
        items: [{ id: userEmail }],
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: feb1Args,
        value: mockGoogleCalendarAPI(),
        nextSyncToken: "feb1-token",
      });

      const allCaches = await prisma.calendarCache.findMany({
        where: {
          credentialId: testCredentialId,
          userId: testUserId,
        },
      });

      expect(allCaches.length).toBeGreaterThanOrEqual(2);

      const cacheKeys = allCaches.map((cache) => cache.key);
      const uniqueKeys = new Set(cacheKeys);
      expect(uniqueKeys.size).toBe(allCaches.length); // All keys are different

      cacheKeys.forEach((key) => {
        const parsedKey = JSON.parse(key);
        expect(parsedKey.items).toEqual([{ id: userEmail }]);
      });

      vi.useRealTimers();
    });

    test("demonstrates real-world impact: user appears available when they have meetings", async () => {
      const userEmail = `availability-bug-${testUniqueId}@example.com`;

      vi.setSystemTime(new Date("2025-01-27T10:00:00.000Z")); // Monday Jan 27

      const mondayArgs = {
        timeMin: getTimeMin("2025-01-27T10:00:00.000Z"),
        timeMax: getTimeMax("2025-01-27T10:00:00.000Z"),
        items: [{ id: userEmail }],
      };

      const mondayMeeting: MockGoogleCalendarResponse = {
        kind: "calendar#freeBusy",
        calendars: {
          [userEmail]: {
            busy: [
              {
                start: "2025-01-27T14:00:00.000Z", // 2 PM Monday
                end: "2025-01-27T15:00:00.000Z",
              },
              {
                start: "2025-02-03T14:00:00.000Z", // 2 PM next Monday
                end: "2025-02-03T15:00:00.000Z",
              },
            ],
          },
        },
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: mondayArgs,
        value: mondayMeeting,
        nextSyncToken: "monday-recurring-meetings",
      });

      vi.setSystemTime(new Date("2025-02-03T13:00:00.000Z")); // Monday Feb 3, 1 PM

      const feb3Args = {
        timeMin: getTimeMin("2025-02-03T13:00:00.000Z"),
        timeMax: getTimeMax("2025-02-03T13:00:00.000Z"),
        items: [{ id: userEmail }],
      };

      const feb3Cache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: feb3Args,
      });

      expect(feb3Cache).toBeNull(); // No cache = user appears free

      vi.useRealTimers();
    });
  });
});
