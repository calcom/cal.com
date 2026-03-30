import { PrismaUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import { prisma } from "@calcom/prisma";
import type { EventType, Team } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, beforeEach, describe, test, vi } from "vitest";
import { expect } from "../expects";
import type { UserCalendarSetup } from "./utils";
import {
  cleanupTeamEventType,
  cleanupUserCalendarSetup,
  createGoogleCalendarApp,
  createTeamEventType,
  createUserWithCalendarSetup,
  FAKED_NOW,
  getDynamicSlotsForDate,
  getTeamSlotsForDate,
  seedCalendarCacheEvent,
  testDate,
  WEEKDAY_HOURLY_SLOTS,
} from "./utils";

describe("getSchedule applies calendar cache per-user in team events", () => {
  let teamTestData: {
    cacheEnabledMember: UserCalendarSetup;
    cacheDisabledMember: UserCalendarSetup;
    team: Team;
    eventType: EventType;
  };

  beforeAll(async () => {
    const suffix = `team-${Date.now()}`;
    await createGoogleCalendarApp();
    const [cacheEnabledMember, cacheDisabledMember] = await Promise.all([
      createUserWithCalendarSetup(`${suffix}-a`),
      createUserWithCalendarSetup(`${suffix}-b`, { enableFeature: false }),
    ]);
    const { team, eventType } = await createTeamEventType({
      suffix,
      users: [cacheEnabledMember.user, cacheDisabledMember.user],
    });
    teamTestData = { cacheEnabledMember, cacheDisabledMember, team, eventType };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupTeamEventType({
      eventTypeId: teamTestData.eventType.id,
      teamId: teamTestData.team.id,
    });
    await Promise.all([
      cleanupUserCalendarSetup(teamTestData.cacheEnabledMember),
      cleanupUserCalendarSetup(teamTestData.cacheDisabledMember),
    ]);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent.deleteMany({
      where: {
        selectedCalendarId: {
          in: [
            teamTestData.cacheEnabledMember.selectedCalendarId,
            teamTestData.cacheDisabledMember.selectedCalendarId,
          ],
        },
      },
    });
  });

  test("Round Robin: cached busy events are ignored for cache-disabled member, so they appear free and all slots are available", async () => {
    await Promise.all([
      seedCalendarCacheEvent({
        selectedCalendarId: teamTestData.cacheEnabledMember.selectedCalendarId,
        externalId: "team-busy-a",
        start: new Date(`${testDate}T09:00:00.000Z`),
        end: new Date(`${testDate}T17:00:00.000Z`),
      }),
      seedCalendarCacheEvent({
        selectedCalendarId: teamTestData.cacheDisabledMember.selectedCalendarId,
        externalId: "team-busy-b",
        start: new Date(`${testDate}T09:00:00.000Z`),
        end: new Date(`${testDate}T17:00:00.000Z`),
      }),
    ]);

    const result = await getTeamSlotsForDate(teamTestData.eventType.id);
    expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
  });

  test("Collective: cached busy events from cache-enabled host block slots for all attendees", async () => {
    await prisma.eventType.update({
      where: { id: teamTestData.eventType.id },
      data: { schedulingType: SchedulingType.COLLECTIVE },
    });
    await prisma.host.updateMany({
      where: { eventTypeId: teamTestData.eventType.id },
      data: { isFixed: true },
    });

    try {
      await seedCalendarCacheEvent({
        selectedCalendarId: teamTestData.cacheEnabledMember.selectedCalendarId,
        externalId: "collective-busy-a",
        start: new Date(`${testDate}T10:00:00.000Z`),
        end: new Date(`${testDate}T15:00:00.000Z`),
      });

      const result = await getTeamSlotsForDate(teamTestData.eventType.id);

      expect(result).toHaveTimeSlots(["09:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"], {
        dateString: testDate,
      });
    } finally {
      await prisma.eventType.update({
        where: { id: teamTestData.eventType.id },
        data: { schedulingType: SchedulingType.ROUND_ROBIN },
      });
      await prisma.host.updateMany({
        where: { eventTypeId: teamTestData.eventType.id },
        data: { isFixed: false },
      });
    }
  });
});

describe("getSchedule applies calendar cache for dynamic group events (no eventTypeId)", () => {
  let dynamicTestData: {
    cacheEnabledMember: UserCalendarSetup;
    cacheDisabledMember: UserCalendarSetup;
  };

  beforeAll(async () => {
    const suffix = `dyn-${Date.now()}`;
    await createGoogleCalendarApp();
    const [cacheEnabledMember, cacheDisabledMember] = await Promise.all([
      createUserWithCalendarSetup(`${suffix}-a`),
      createUserWithCalendarSetup(`${suffix}-b`, { enableFeature: false }),
    ]);
    dynamicTestData = { cacheEnabledMember, cacheDisabledMember };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await Promise.all([
      cleanupUserCalendarSetup(dynamicTestData.cacheEnabledMember),
      cleanupUserCalendarSetup(dynamicTestData.cacheDisabledMember),
    ]);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent.deleteMany({
      where: {
        selectedCalendarId: {
          in: [
            dynamicTestData.cacheEnabledMember.selectedCalendarId,
            dynamicTestData.cacheDisabledMember.selectedCalendarId,
          ],
        },
      },
    });
  });

  // Dynamic events use the default 30-minute event template (length: 30)
  // Working hours 09:00-17:00 with 30-min slots → 09:00, 09:30, 10:00, ..., 16:30

  test("cached events from cache-enabled user block slots in dynamic collective event", async () => {
    await seedCalendarCacheEvent({
      selectedCalendarId: dynamicTestData.cacheEnabledMember.selectedCalendarId,
      externalId: "dyn-busy-a",
      start: new Date(`${testDate}T10:00:00.000Z`),
      end: new Date(`${testDate}T15:00:00.000Z`),
    });

    const result = await getDynamicSlotsForDate([
      dynamicTestData.cacheEnabledMember.user.username!,
      dynamicTestData.cacheDisabledMember.user.username!,
    ]);

    expect(result).toHaveTimeSlots(
      ["09:00:00.000Z", "09:30:00.000Z", "15:00:00.000Z", "15:30:00.000Z", "16:00:00.000Z", "16:30:00.000Z"],
      { dateString: testDate }
    );
  });

  test("cached events from cache-disabled user are ignored in dynamic group", async () => {
    await Promise.all([
      seedCalendarCacheEvent({
        selectedCalendarId: dynamicTestData.cacheEnabledMember.selectedCalendarId,
        externalId: "dyn-busy-enabled",
        start: new Date(`${testDate}T10:00:00.000Z`),
        end: new Date(`${testDate}T15:00:00.000Z`),
      }),
      seedCalendarCacheEvent({
        selectedCalendarId: dynamicTestData.cacheDisabledMember.selectedCalendarId,
        externalId: "dyn-busy-disabled",
        start: new Date(`${testDate}T09:00:00.000Z`),
        end: new Date(`${testDate}T17:00:00.000Z`),
      }),
    ]);

    const result = await getDynamicSlotsForDate([
      dynamicTestData.cacheEnabledMember.user.username!,
      dynamicTestData.cacheDisabledMember.user.username!,
    ]);

    // Cache-disabled member's all-day event is ignored (appears free),
    // only cache-enabled member's 10-15 event blocks slots
    expect(result).toHaveTimeSlots(
      ["09:00:00.000Z", "09:30:00.000Z", "15:00:00.000Z", "15:30:00.000Z", "16:00:00.000Z", "16:30:00.000Z"],
      { dateString: testDate }
    );
  });

  test("batch prefetch uses single query for dynamic group events", async () => {
    vi.setSystemTime(FAKED_NOW);

    const checkIfUsersHaveFeatureSpy = vi.spyOn(
      PrismaUserFeatureRepository.prototype,
      "checkIfUsersHaveFeatureNonHierarchical"
    );
    const checkIfUserHasFeatureSpy = vi.spyOn(
      PrismaUserFeatureRepository.prototype,
      "checkIfUserHasFeatureNonHierarchical"
    );

    try {
      await getDynamicSlotsForDate([
        dynamicTestData.cacheEnabledMember.user.username!,
        dynamicTestData.cacheDisabledMember.user.username!,
      ]);

      expect(checkIfUsersHaveFeatureSpy).toHaveBeenCalledTimes(1);
      expect(checkIfUserHasFeatureSpy).not.toHaveBeenCalled();
    } finally {
      checkIfUsersHaveFeatureSpy.mockRestore();
      checkIfUserHasFeatureSpy.mockRestore();
    }
  });
});
