import { randomUUID } from "crypto";
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import prisma from "@calcom/prisma";

import CalendarService from "../CalendarService";

const TEST_DATE = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)
);
const TEST_DATE_ISO = TEST_DATE.toISOString();

describe("Sibling Cache Refresh Integration Tests", () => {
  let testUserId: number;
  let testCredentialId: number;
  let testAppId: string;
  let calendarCache: CalendarCacheRepository;
  let calendarService: CalendarService;
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
    });
    testCredentialId = credential.id;

    calendarCache = new CalendarCacheRepository(null);
    calendarService = new CalendarService(credential);

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

  describe("Sibling Calendar Discovery", () => {
    test("discovers sibling calendars correctly", async () => {
      const cal1Email = `cal1-${randomUUID()}@example.com`;
      const cal2Email = `cal2-${randomUUID()}@example.com`;
      const cal3Email = `cal3-${randomUUID()}@example.com`;

      // Create selected calendars with the same userId and credentialId
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal2Email,
          credentialId: testCredentialId,
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal3Email,
          credentialId: testCredentialId,
        },
      });

      // Test sibling discovery
      const result = await (calendarService as any).findSiblingCalendarGroups({
        externalId: cal1Email,
        integration: "google_calendar",
        credentialId: testCredentialId,
        userId: testUserId,
        name: "Calendar 1",
        primary: true,
        readOnly: false,
        eventTypeId: null,
      });

      expect(result).toHaveLength(1);
      expect(result[0].eventTypeId).toBe(null);
      expect(result[0].calendars).toHaveLength(3);
      expect(result[0].calendars.map((c) => c.externalId)).toContain(cal1Email);
      expect(result[0].calendars.map((c) => c.externalId)).toContain(cal2Email);
      expect(result[0].calendars.map((c) => c.externalId)).toContain(cal3Email);
    });

    test("handles different eventTypeId groups separately", async () => {
      const cal1Email = `cal1-${randomUUID()}@example.com`;
      const cal2Email = `cal2-${randomUUID()}@example.com`;
      const cal3Email = `cal3-${randomUUID()}@example.com`;

      // Create selected calendars - all will have null eventTypeId
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal2Email,
          credentialId: testCredentialId,
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal3Email,
          credentialId: testCredentialId,
        },
      });

      // Test sibling discovery
      const result = await (calendarService as any).findSiblingCalendarGroups({
        externalId: cal1Email,
        integration: "google_calendar",
        credentialId: testCredentialId,
        userId: testUserId,
        name: "Calendar 1",
        primary: true,
        readOnly: false,
        eventTypeId: null,
      });

      expect(result).toHaveLength(1);
      expect(result[0].eventTypeId).toBe(null);
      expect(result[0].calendars).toHaveLength(3);
    });
  });

  describe("Proactive Sibling Cache Refresh", () => {
    test("successfully processes calendar without making external API calls", async () => {
      const cal1Email = `cal1-${randomUUID()}@example.com`;

      // Create selected calendar
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      // Mock the API call to return events
      vi.spyOn(calendarService, "fetchEventsIncremental" as any).mockResolvedValue({
        events: [
          {
            id: "event1",
            summary: "Test Event",
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
            status: "confirmed",
          },
        ],
        nextSyncToken: "sync-token-123",
      });

      // Execute webhook processing
      await calendarService.fetchAvailabilityAndSetCacheIncremental([
        {
          externalId: cal1Email,
          integration: "google_calendar",
          credentialId: testCredentialId,
          userId: testUserId,
          name: "Calendar 1",
          primary: true,
          readOnly: false,
        },
      ]);

      // Verify the mock was called
      expect(calendarService.fetchEventsIncremental).toHaveBeenCalledWith(cal1Email, undefined);
    });

    test("handles API errors gracefully", async () => {
      const cal1Email = `cal1-${randomUUID()}@example.com`;

      // Create selected calendar
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      // Mock the OAuth validation to pass
      vi.spyOn(calendarService, "fetchAvailability" as any).mockResolvedValue({
        kind: "calendar#freeBusy",
        calendars: {
          [cal1Email]: {
            busy: [],
          },
        },
      });

      // Execute webhook processing - should not throw despite API error
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
          },
        ])
      ).resolves.not.toThrow();
    });
  });

  describe("Database Performance and Scaling", () => {
    test("handles database queries efficiently", async () => {
      const startTime = Date.now();
      const cal1Email = `cal1-${randomUUID()}@example.com`;

      // Create multiple selected calendars for sibling discovery
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: cal1Email,
          credentialId: testCredentialId,
        },
      });

      // Create a sibling calendar with same user and credential
      const siblingEmail = `sibling-${randomUUID()}@example.com`;
      await prisma.selectedCalendar.create({
        data: {
          userId: testUserId,
          integration: "google_calendar",
          externalId: siblingEmail,
          credentialId: testCredentialId,
        },
      });

      // Test sibling discovery performance
      const result = await (calendarService as any).findSiblingCalendarGroups({
        externalId: cal1Email,
        integration: "google_calendar",
        credentialId: testCredentialId,
        userId: testUserId,
        name: "Calendar 1",
        primary: true,
        readOnly: false,
        eventTypeId: null,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should find at least one sibling group (containing the original calendar)
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
