import { PrismaClient } from "@prisma/client";
import { describe, expect, beforeAll, afterAll, beforeEach, it } from "vitest";

import { getCachedCalendar, hasCompleteCacheHits } from "@calcom/app-store/_utils/getCachedCalendar";
import { calendarCacheStore } from "@calcom/features/calendar-cache/calendar-cache-store";
import type { CalendarEvent, IntegrationCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

const prisma = new PrismaClient();

describe("CachedCalendarService Integration Tests", () => {
  let testUser: { id: number; email: string; username: string };
  let testCredential: { id: number; userId: number; type: string; key: any };

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test-cached-calendar-service-${Date.now()}@example.com`,
        username: `test-cached-calendar-service-${Date.now()}`,
      },
    });

    testCredential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: { token: "test-token" },
        userId: testUser.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.credential.delete({
      where: { id: testCredential.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  beforeEach(() => {
    calendarCacheStore.clear();
  });

  describe("CachedCalendarService", () => {
    it("should only use CachedCalendarService when there's 100% cache hits", async () => {
      const mockCredential: CredentialForCalendarService = {
        id: testCredential.id,
        type: "google_calendar",
        key: { token: "mock-token" },
        userId: testUser.id,
        appId: "google-calendar",
        invalid: false,
      };

      const mockSelectedCalendars: IntegrationCalendar[] = [
        {
          credentialId: mockCredential.id,
          externalId: "primary",
          integration: "google_calendar",
          userId: testUser.id,
        },
      ];

      const hasCacheHitsBeforeCache = hasCompleteCacheHits(
        testUser.id,
        [mockCredential],
        mockSelectedCalendars,
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z"
      );

      expect(hasCacheHitsBeforeCache).toBe(false);

      const cacheEntry = {
        userId: testUser.id,
        credentialId: mockCredential.id,
        timeMin: "2023-05-01T00:00:00Z",
        timeMax: "2023-05-02T00:00:00Z",
        items: [{ id: "primary" }],
        busyTimes: [{ start: new Date("2023-05-01T10:00:00Z"), end: new Date("2023-05-01T11:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry);

      const hasCacheHitsAfterCache = hasCompleteCacheHits(
        testUser.id,
        [mockCredential],
        mockSelectedCalendars,
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z"
      );

      expect(hasCacheHitsAfterCache).toBe(true);

      const calendarService = await getCachedCalendar(
        mockCredential,
        testUser.id,
        mockSelectedCalendars,
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z"
      );

      const busyTimes = await calendarService.getAvailability(
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z",
        mockSelectedCalendars,
        true,
        false
      );

      expect(busyTimes).toHaveLength(1);
      expect(new Date(busyTimes[0].start).toISOString()).toBe(new Date("2023-05-01T10:00:00Z").toISOString());
      expect(new Date(busyTimes[0].end).toISOString()).toBe(new Date("2023-05-01T11:00:00Z").toISOString());

      const hasCacheHitsDifferentTime = hasCompleteCacheHits(
        testUser.id,
        [mockCredential],
        mockSelectedCalendars,
        "2023-06-01T00:00:00Z",
        "2023-06-02T00:00:00Z"
      );

      expect(hasCacheHitsDifferentTime).toBe(false);
    });

    it("should throw errors for write operations", async () => {
      const mockCredential: CredentialForCalendarService = {
        id: testCredential.id,
        type: "google_calendar",
        key: { token: "mock-token" },
        userId: testUser.id,
        appId: "google-calendar",
        invalid: false,
      };

      const mockSelectedCalendars: IntegrationCalendar[] = [
        {
          credentialId: mockCredential.id,
          externalId: "primary",
          integration: "google_calendar",
          userId: testUser.id,
        },
      ];

      const cacheEntry = {
        userId: testUser.id,
        credentialId: mockCredential.id,
        timeMin: "2023-05-01T00:00:00Z",
        timeMax: "2023-05-02T00:00:00Z",
        items: [{ id: "primary" }],
        busyTimes: [{ start: new Date("2023-05-01T10:00:00Z"), end: new Date("2023-05-01T11:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry);

      const calendarService = await getCachedCalendar(
        mockCredential,
        testUser.id,
        mockSelectedCalendars,
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z"
      );

      const mockEvent: CalendarEvent = {
        type: "default",
        startTime: new Date("2023-05-01T12:00:00Z").toISOString(),
        endTime: new Date("2023-05-01T13:00:00Z").toISOString(),
        title: "Test Event",
        attendees: [],
        organizer: { email: "test@example.com", name: "Test User" },
      };

      await expect(calendarService.createEvent(mockEvent, mockCredential.id)).rejects.toThrow(
        "CachedCalendarService does not support creating events"
      );

      await expect(calendarService.updateEvent("test-uid", mockEvent)).rejects.toThrow(
        "CachedCalendarService does not support updating events"
      );

      await expect(calendarService.deleteEvent("test-uid", mockEvent)).rejects.toThrow(
        "CachedCalendarService does not support deleting events"
      );

      await expect(calendarService.listCalendars()).rejects.toThrow(
        "CachedCalendarService does not support listing calendars"
      );
    });

    it("should handle getAvailabilityWithTimeZones correctly", async () => {
      const mockCredential: CredentialForCalendarService = {
        id: testCredential.id,
        type: "google_calendar",
        key: { token: "mock-token" },
        userId: testUser.id,
        appId: "google-calendar",
        invalid: false,
      };

      const mockSelectedCalendars: IntegrationCalendar[] = [
        {
          credentialId: mockCredential.id,
          externalId: "primary",
          integration: "google_calendar",
          userId: testUser.id,
        },
      ];

      const cacheEntry = {
        userId: testUser.id,
        credentialId: mockCredential.id,
        timeMin: "2023-05-01T00:00:00Z",
        timeMax: "2023-05-02T00:00:00Z",
        items: [{ id: "primary" }],
        busyTimes: [
          {
            start: new Date("2023-05-01T10:00:00Z"),
            end: new Date("2023-05-01T11:00:00Z"),
            timeZone: "America/New_York",
          },
        ],
      };

      calendarCacheStore.set(cacheEntry);

      const calendarService = await getCachedCalendar(
        mockCredential,
        testUser.id,
        mockSelectedCalendars,
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z"
      );

      const busyTimesWithTZ = await calendarService.getAvailabilityWithTimeZones(
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z",
        mockSelectedCalendars,
        false
      );

      expect(busyTimesWithTZ).toHaveLength(1);
      expect(new Date(busyTimesWithTZ[0].start).toISOString()).toBe(
        new Date("2023-05-01T10:00:00Z").toISOString()
      );
      expect(new Date(busyTimesWithTZ[0].end).toISOString()).toBe(
        new Date("2023-05-01T11:00:00Z").toISOString()
      );
      expect(busyTimesWithTZ[0].timeZone).toBe("America/New_York");

      const cacheEntryNoTZ = {
        userId: testUser.id,
        credentialId: mockCredential.id,
        timeMin: "2023-06-01T00:00:00Z",
        timeMax: "2023-06-02T00:00:00Z",
        items: [{ id: "primary" }],
        busyTimes: [
          {
            start: new Date("2023-06-01T10:00:00Z"),
            end: new Date("2023-06-01T11:00:00Z"),
          },
        ],
      };

      calendarCacheStore.set(cacheEntryNoTZ);

      const busyTimesWithDefaultTZ = await calendarService.getAvailabilityWithTimeZones(
        "2023-06-01T00:00:00Z",
        "2023-06-02T00:00:00Z",
        mockSelectedCalendars,
        false
      );

      expect(busyTimesWithDefaultTZ).toHaveLength(1);
      expect(busyTimesWithDefaultTZ[0].timeZone).toBe("UTC");
    });
  });

  describe("CalendarCacheStore", () => {
    it("should correctly identify users with complete cache hits", () => {
      const mockCredential1: CredentialForCalendarService = {
        id: 1001,
        type: "google_calendar",
        key: { token: "mock-token-1" },
        userId: testUser.id,
        appId: "google-calendar",
        invalid: false,
      };

      const mockCredential2: CredentialForCalendarService = {
        id: 1002,
        type: "google_calendar",
        key: { token: "mock-token-2" },
        userId: testUser.id,
        appId: "google-calendar",
        invalid: false,
      };

      const mockSelectedCalendars: IntegrationCalendar[] = [
        {
          credentialId: mockCredential1.id,
          externalId: "calendar1",
          integration: "google_calendar",
          userId: testUser.id,
        },
        {
          credentialId: mockCredential2.id,
          externalId: "calendar2",
          integration: "google_calendar",
          userId: testUser.id,
        },
      ];

      const cacheEntry1 = {
        userId: testUser.id,
        credentialId: mockCredential1.id,
        timeMin: "2023-07-01T00:00:00Z",
        timeMax: "2023-07-02T00:00:00Z",
        items: [{ id: "calendar1" }],
        busyTimes: [{ start: new Date("2023-07-01T10:00:00Z"), end: new Date("2023-07-01T11:00:00Z") }],
      };

      const cacheEntry2 = {
        userId: testUser.id,
        credentialId: mockCredential2.id,
        timeMin: "2023-07-01T00:00:00Z",
        timeMax: "2023-07-02T00:00:00Z",
        items: [{ id: "calendar2" }],
        busyTimes: [{ start: new Date("2023-07-01T14:00:00Z"), end: new Date("2023-07-01T15:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry1);
      calendarCacheStore.set(cacheEntry2);

      const userCredentials = [
        { userId: testUser.id, credentialId: mockCredential1.id },
        { userId: testUser.id, credentialId: mockCredential2.id },
      ];

      const calendarItems = {
        [mockCredential1.id]: [{ id: "calendar1" }],
        [mockCredential2.id]: [{ id: "calendar2" }],
      };

      const usersWithCacheHits = calendarCacheStore.getUsersWithCompleteCacheHits(
        userCredentials,
        "2023-07-01T00:00:00Z",
        "2023-07-02T00:00:00Z",
        calendarItems
      );

      expect(usersWithCacheHits).toContain(testUser.id);

      calendarCacheStore.clear();
      calendarCacheStore.set(cacheEntry1);

      const usersWithIncompleteCacheHits = calendarCacheStore.getUsersWithCompleteCacheHits(
        userCredentials,
        "2023-07-01T00:00:00Z",
        "2023-07-02T00:00:00Z",
        calendarItems
      );

      expect(usersWithIncompleteCacheHits).not.toContain(testUser.id);
    });
  });
});
