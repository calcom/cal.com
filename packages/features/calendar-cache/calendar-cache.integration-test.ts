import { PrismaClient } from "@prisma/client";
import { describe, expect, beforeAll, afterAll, beforeEach, it } from "vitest";

import type { IntegrationCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { calendarCacheStore } from "./calendar-cache-store";
import { getShouldServeCache } from "./lib/getShouldServeCache";

const prisma = new PrismaClient();

describe("Calendar Cache Integration Tests", () => {
  let testUser: { id: number; email: string; username: string };
  let testTeam: { id: number };
  let testCredential: { id: number; userId: number; type: string; key: any };
  const testFeature = "calendar-cache-serve";

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `test-calendar-cache-${Date.now()}@example.com`,
        username: `test-calendar-cache-${Date.now()}`,
      },
    });

    testTeam = await prisma.team.create({
      data: {
        name: `Test Calendar Cache Team ${Date.now()}`,
        slug: `test-calendar-cache-team-${Date.now()}`,
      },
    });

    testCredential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: { token: "test-token" },
        userId: testUser.id,
      },
    });

    await prisma.membership.create({
      data: {
        teamId: testTeam.id,
        userId: testUser.id,
        role: "MEMBER",
        accepted: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.selectedCalendar.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.credential.delete({
      where: { id: testCredential.id },
    });
    await prisma.membership.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: testTeam.id },
    });
    await prisma.feature.deleteMany({
      where: { slug: testFeature },
    });
    await prisma.team.delete({
      where: { id: testTeam.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  beforeEach(async () => {
    await prisma.feature.deleteMany({
      where: { slug: testFeature },
    });
    await prisma.teamFeatures.deleteMany({
      where: { teamId: testTeam.id },
    });

    calendarCacheStore.clear();
  });

  describe("getShouldServeCache", () => {
    it("should return undefined when no team ID is provided", async () => {
      const result = await getShouldServeCache(undefined, undefined);
      expect(result).toBeUndefined();
    });

    it("should return the provided boolean value when explicitly set", async () => {
      const result = await getShouldServeCache(true, testTeam.id);
      expect(result).toBe(true);

      const result2 = await getShouldServeCache(false, testTeam.id);
      expect(result2).toBe(false);
    });

    it("should check team feature flag when boolean not provided", async () => {
      await prisma.feature.create({
        data: {
          slug: testFeature,
          enabled: true,
          type: "OPERATIONAL",
        },
      });

      await prisma.teamFeatures.create({
        data: {
          teamId: testTeam.id,
          featureId: testFeature,
          assignedBy: "test",
        },
      });

      const result = await getShouldServeCache(undefined, testTeam.id);
      expect(result).toBe(true);
    });
  });

  describe("calendarCacheStore", () => {
    it("should store and retrieve calendar cache entries", () => {
      const cacheEntry = {
        userId: testUser.id,
        credentialId: testCredential.id,
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar1" }],
        busyTimes: [{ start: new Date("2023-01-01T10:00:00Z"), end: new Date("2023-01-01T11:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry);

      const retrievedEntry = calendarCacheStore.get(
        testCredential.id,
        testUser.id,
        "2023-01-01T00:00:00Z",
        "2023-01-02T00:00:00Z",
        [{ id: "calendar1" }]
      );

      expect(retrievedEntry).toBeDefined();
      expect(retrievedEntry?.userId).toBe(testUser.id);
      expect(retrievedEntry?.credentialId).toBe(testCredential.id);
      expect(retrievedEntry?.busyTimes.length).toBe(1);
    });

    it("should clear all entries when clear is called", () => {
      const cacheEntry = {
        userId: testUser.id,
        credentialId: testCredential.id,
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar1" }],
        busyTimes: [{ start: new Date("2023-01-01T10:00:00Z"), end: new Date("2023-01-01T11:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry);
      expect(calendarCacheStore.entries.length).toBeGreaterThan(0);

      calendarCacheStore.clear();
      expect(calendarCacheStore.entries.length).toBe(0);
    });

    it("should identify users with complete cache hits", () => {
      const cacheEntry1 = {
        userId: testUser.id,
        credentialId: testCredential.id,
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar1" }],
        busyTimes: [{ start: new Date("2023-01-01T10:00:00Z"), end: new Date("2023-01-01T11:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry1);

      const userCredentials = [{ userId: testUser.id, credentialId: testCredential.id }];
      const calendarItems = {
        [testCredential.id]: [{ id: "calendar1" }],
      };

      const usersWithCacheHits = calendarCacheStore.getUsersWithCompleteCacheHits(
        userCredentials,
        "2023-01-01T00:00:00Z",
        "2023-01-02T00:00:00Z",
        calendarItems
      );

      expect(usersWithCacheHits).toContain(testUser.id);
    });

    it("should not identify users with incomplete cache hits", () => {
      const cacheEntry1 = {
        userId: testUser.id,
        credentialId: testCredential.id,
        timeMin: "2023-01-01T00:00:00Z",
        timeMax: "2023-01-02T00:00:00Z",
        items: [{ id: "calendar1" }],
        busyTimes: [{ start: new Date("2023-01-01T10:00:00Z"), end: new Date("2023-01-01T11:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry1);

      const userCredentials = [{ userId: testUser.id, credentialId: testCredential.id }];
      const calendarItems = {
        [testCredential.id]: [{ id: "calendar1" }],
      };

      const usersWithCacheHits = calendarCacheStore.getUsersWithCompleteCacheHits(
        userCredentials,
        "2023-01-03T00:00:00Z", // Different time range
        "2023-01-04T00:00:00Z",
        calendarItems
      );

      expect(usersWithCacheHits).not.toContain(testUser.id);
    });
  });

  describe("CachedCalendarService Integration", () => {
    it("should test CachedCalendarService with mock calendar data", async () => {
      const mockCredential: CredentialForCalendarService = {
        id: 999,
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

      const { default: CachedCalendarService } = await import(
        "@calcom/app-store/googlecalendar/lib/CachedCalendarService"
      );

      const cachedCalendarService = new CachedCalendarService(mockCredential);

      const busyTimes = await cachedCalendarService.getAvailability(
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z",
        mockSelectedCalendars,
        true,
        false
      );

      expect(busyTimes).toHaveLength(1);
      expect(busyTimes[0].start).toEqual(cacheEntry.busyTimes[0].start);
      expect(busyTimes[0].end).toEqual(cacheEntry.busyTimes[0].end);

      const busyTimesWithTZ = await cachedCalendarService.getAvailabilityWithTimeZones(
        "2023-05-01T00:00:00Z",
        "2023-05-02T00:00:00Z",
        mockSelectedCalendars,
        false
      );

      expect(busyTimesWithTZ).toHaveLength(1);
      expect(busyTimesWithTZ[0].start).toEqual(cacheEntry.busyTimes[0].start);
      expect(busyTimesWithTZ[0].end).toEqual(cacheEntry.busyTimes[0].end);
      expect(busyTimesWithTZ[0].timeZone).toEqual("UTC");
    });

    it("should test cache miss behavior in CachedCalendarService", async () => {
      const mockCredential: CredentialForCalendarService = {
        id: 888,
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

      const { default: CachedCalendarService } = await import(
        "@calcom/app-store/googlecalendar/lib/CachedCalendarService"
      );

      const cachedCalendarService = new CachedCalendarService(mockCredential);

      const busyTimes = await cachedCalendarService.getAvailability(
        "2023-06-01T00:00:00Z", // Different time range than any cache entry
        "2023-06-02T00:00:00Z",
        mockSelectedCalendars,
        true,
        false
      );

      expect(busyTimes).toHaveLength(0);
    });

    it("should test hasCompleteCacheHits function", async () => {
      const { hasCompleteCacheHits } = await import("@calcom/app-store/_utils/getCachedCalendar");

      const mockCredential: CredentialForCalendarService = {
        id: 777,
        type: "google_calendar",
        key: { token: "mock-token" },
        userId: testUser.id,
        appId: "google-calendar",
        invalid: false,
      };

      const mockSelectedCalendars: IntegrationCalendar[] = [
        {
          credentialId: mockCredential.id,
          externalId: "calendar1",
          integration: "google_calendar",
          userId: testUser.id,
        },
      ];

      const cacheEntry = {
        userId: testUser.id,
        credentialId: mockCredential.id,
        timeMin: "2023-07-01T00:00:00Z",
        timeMax: "2023-07-02T00:00:00Z",
        items: [{ id: "calendar1" }],
        busyTimes: [{ start: new Date("2023-07-01T10:00:00Z"), end: new Date("2023-07-01T11:00:00Z") }],
      };

      calendarCacheStore.set(cacheEntry);

      const hasHits = hasCompleteCacheHits(
        testUser.id,
        [mockCredential],
        mockSelectedCalendars,
        "2023-07-01T00:00:00Z",
        "2023-07-02T00:00:00Z"
      );

      expect(hasHits).toBe(true);

      const hasNoHits = hasCompleteCacheHits(
        testUser.id,
        [mockCredential],
        mockSelectedCalendars,
        "2023-08-01T00:00:00Z",
        "2023-08-02T00:00:00Z"
      );

      expect(hasNoHits).toBe(false);
    });
  });
});
