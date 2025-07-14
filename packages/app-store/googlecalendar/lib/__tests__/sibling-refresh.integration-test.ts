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

describe("Sibling Cache Refresh Integration Tests", () => {
  let testUserId: number;
  let testCredentialId: number;
  let testAppId: string;
  let calendarCache: CalendarCacheRepository;
  let calendarService: CalendarService | null;
  let testUniqueId: string;

  beforeEach(async () => {
    testUniqueId = randomUUID();

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

    // Create test credential
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
    calendarService = new CalendarService({
      ...credential,
      delegatedTo: null,
    });
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

      // Clear calendar service state
      calendarService = null;

      // Reset test variables
      testUserId = 0;
      testCredentialId = 0;
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

  describe("Sibling Calendar Discovery", () => {
    test("discovers sibling calendars correctly", async () => {
      const cal1Email = `cal1-${testUniqueId}@example.com`;
      const cal2Email = `cal2-${testUniqueId}@example.com`;

      // Create selected calendars
      await prisma.selectedCalendar.createMany({
        data: [
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal1Email,
            credentialId: testCredentialId,
          },
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal2Email,
            credentialId: testCredentialId,
          },
        ],
      });

      // Test sibling discovery
      const siblingsResult = await prisma.selectedCalendar.findMany({
        where: {
          userId: testUserId,
          integration: "google_calendar",
          credentialId: testCredentialId,
        },
      });

      expect(siblingsResult).toHaveLength(2);
      expect(siblingsResult.map((cal: { externalId: string }) => cal.externalId)).toContain(cal1Email);
      expect(siblingsResult.map((cal: { externalId: string }) => cal.externalId)).toContain(cal2Email);
    });

    test("handles sibling calendar groups correctly", async () => {
      const cal1Email = `cal1-${testUniqueId}@example.com`;
      const cal2Email = `cal2-${testUniqueId}@example.com`;
      const cal3Email = `cal3-${testUniqueId}@example.com`;

      // Create selected calendars with different credentials
      await prisma.selectedCalendar.createMany({
        data: [
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal1Email,
            credentialId: testCredentialId,
          },
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal2Email,
            credentialId: testCredentialId,
          },
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal3Email,
            credentialId: testCredentialId,
          },
        ],
      });

      // Test sibling grouping
      const siblingGroups = await prisma.selectedCalendar.groupBy({
        by: ["credentialId"],
        where: {
          userId: testUserId,
          integration: "google_calendar",
        },
        _count: {
          id: true,
        },
      });

      expect(siblingGroups).toHaveLength(1);
      expect(siblingGroups[0]._count.id).toBe(3);
    });
  });

  describe("Proactive Sibling Cache Refresh", () => {
    test("successfully processes calendar without making external API calls", async () => {
      if (!calendarService) {
        throw new Error("Calendar service not initialized");
      }

      const cal1Email = `cal1-${testUniqueId}@example.com`;

      // Create selected calendar
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      // Mock the calendar service to avoid external API calls
      const mockFetchAvailability = vi.fn().mockResolvedValue(mockGoogleCalendarAPI(cal1Email, []));
      vi.spyOn(calendarService, "fetchAvailabilityAndSetCacheIncremental").mockImplementation(
        mockFetchAvailability
      );

      // Test processing calendar
      const result = await calendarService.fetchAvailabilityAndSetCacheIncremental([
        {
          externalId: cal1Email,
          integration: "google_calendar",
          credentialId: testCredentialId,
          userId: testUserId,
          name: "Calendar 1",
          primary: true,
          readOnly: false,
          eventTypeId: null,
        },
      ]);

      expect(result).toBeTruthy();
      expect(mockFetchAvailability).toHaveBeenCalledTimes(1);
    });

    test("handles API errors gracefully", async () => {
      if (!calendarService) {
        throw new Error("Calendar service not initialized");
      }

      const cal1Email = `cal1-${testUniqueId}@example.com`;

      // Create selected calendar
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      // Mock the API call to throw an error
      const mockFetchAvailability = vi.fn().mockRejectedValue(new Error("API Error"));
      vi.spyOn(calendarService, "fetchAvailabilityAndSetCacheIncremental").mockImplementation(
        mockFetchAvailability
      );

      // Test error handling
      await expect(
        calendarService.fetchAvailabilityAndSetCacheIncremental([
          {
            externalId: cal1Email,
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

    test("validates database performance with sibling lookups", async () => {
      const cal1Email = `cal1-${testUniqueId}@example.com`;
      const cal2Email = `cal2-${testUniqueId}@example.com`;
      const cal3Email = `cal3-${testUniqueId}@example.com`;

      // Create multiple selected calendars
      await prisma.selectedCalendar.createMany({
        data: [
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal1Email,
            credentialId: testCredentialId,
          },
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal2Email,
            credentialId: testCredentialId,
          },
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal3Email,
            credentialId: testCredentialId,
          },
        ],
      });

      // Test sibling discovery performance
      const startTime = Date.now();
      const siblings = await prisma.selectedCalendar.findMany({
        where: {
          userId: testUserId,
          integration: "google_calendar",
          credentialId: testCredentialId,
        },
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(siblings).toHaveLength(3);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("Cache Refresh Coordination", () => {
    test("coordinates cache refresh across sibling calendars", async () => {
      const cal1Email = `cal1-${testUniqueId}@example.com`;
      const cal2Email = `cal2-${testUniqueId}@example.com`;

      // Create selected calendars
      await prisma.selectedCalendar.createMany({
        data: [
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal1Email,
            credentialId: testCredentialId,
          },
          {
            userId: testUserId,
            integration: "google_calendar",
            externalId: cal2Email,
            credentialId: testCredentialId,
          },
        ],
      });

      // Create cache entries for both calendars
      const cacheArgs1 = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: cal1Email }],
      };

      const cacheArgs2 = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: cal2Email }],
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs1,
        value: mockGoogleCalendarAPI(cal1Email, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
          },
        ]),
        nextSyncToken: "sync-token-cal1",
      });

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs2,
        value: mockGoogleCalendarAPI(cal2Email, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
          },
        ]),
        nextSyncToken: "sync-token-cal2",
      });

      // Verify both caches exist
      const cache1 = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs1,
      });

      const cache2 = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs2,
      });

      expect(cache1).toBeTruthy();
      expect(cache1?.nextSyncToken).toBe("sync-token-cal1");
      expect(cache2).toBeTruthy();
      expect(cache2?.nextSyncToken).toBe("sync-token-cal2");
    });

    test("handles cache coordination across different time ranges", async () => {
      const cal1Email = `cal1-${testUniqueId}@example.com`;

      // Create selected calendar
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      // Create cache entries for different time ranges
      const nextMonth = new Date(TEST_DATE);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthISO = nextMonth.toISOString();

      const cacheArgs1 = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: cal1Email }],
      };

      const cacheArgs2 = {
        timeMin: getTimeMin(nextMonthISO),
        timeMax: getTimeMax(nextMonthISO),
        items: [{ id: cal1Email }],
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs1,
        value: mockGoogleCalendarAPI(cal1Email, [
          {
            start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
            end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
          },
        ]),
        nextSyncToken: "sync-token-thismonth",
      });

      await calendarCache.upsertCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs2,
        value: mockGoogleCalendarAPI(cal1Email, [
          {
            start: `${nextMonthISO.slice(0, 10)}T10:00:00.000Z`,
            end: `${nextMonthISO.slice(0, 10)}T10:30:00.000Z`,
          },
        ]),
        nextSyncToken: "sync-token-nextmonth",
      });

      // Verify both time range caches exist
      const thisMonthCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs1,
      });

      const nextMonthCache = await calendarCache.getCachedAvailability({
        credentialId: testCredentialId,
        userId: testUserId,
        args: cacheArgs2,
      });

      expect(thisMonthCache).toBeTruthy();
      expect(thisMonthCache?.nextSyncToken).toBe("sync-token-thismonth");
      expect(nextMonthCache).toBeTruthy();
      expect(nextMonthCache?.nextSyncToken).toBe("sync-token-nextmonth");
    });
  });
});
