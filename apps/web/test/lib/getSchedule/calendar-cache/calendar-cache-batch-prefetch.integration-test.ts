import { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";
import { CachedFeatureRepository } from "@calcom/features/flags/repositories/CachedFeatureRepository";
import { PrismaUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import { prisma } from "@calcom/prisma";
import type { EventType, Schedule, Team, User } from "@calcom/prisma/client";
import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";
import { expect } from "../expects";
import type { UserCalendarSetup } from "./utils";
import {
  CALENDAR_CACHE_FEATURE,
  cleanupTeamEventType,
  cleanupUserCalendarSetup,
  createGoogleCalendarApp,
  createScheduleWithAvailability,
  createTeamEventType,
  createTestUser,
  createUserWithCalendarSetup,
  enableFeatureForUser,
  FAKED_NOW,
  getSlots,
  testDate,
} from "./utils";

describe("prefetchCalendarCacheFlags uses a single batch query instead of N per-user queries", () => {
  let batchQueryTestData: {
    members: UserCalendarSetup[];
    team: Team;
    eventType: EventType;
  };

  let checkIfUsersHaveFeatureSpy: ReturnType<typeof vi.spyOn>;
  let checkIfUserHasFeatureSpy: ReturnType<typeof vi.spyOn>;
  let checkIfFeatureIsEnabledGloballySpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    const suffix = `batch-n1-${Date.now()}`;
    await createGoogleCalendarApp();
    const members = await Promise.all([1, 2, 3, 4].map((i) => createUserWithCalendarSetup(`${suffix}-${i}`)));
    const { team, eventType } = await createTeamEventType({
      suffix,
      users: members.map((m) => m.user),
    });
    batchQueryTestData = { members, team, eventType };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupTeamEventType({
      eventTypeId: batchQueryTestData.eventType.id,
      teamId: batchQueryTestData.team.id,
    });
    await Promise.all(batchQueryTestData.members.map((m) => cleanupUserCalendarSetup(m)));
  });

  function setupSpies() {
    checkIfUsersHaveFeatureSpy = vi.spyOn(
      PrismaUserFeatureRepository.prototype,
      "checkIfUsersHaveFeatureNonHierarchical"
    );
    checkIfUserHasFeatureSpy = vi.spyOn(
      PrismaUserFeatureRepository.prototype,
      "checkIfUserHasFeatureNonHierarchical"
    );
    checkIfFeatureIsEnabledGloballySpy = vi.spyOn(
      CachedFeatureRepository.prototype,
      "checkIfFeatureIsEnabledGlobally"
    );
  }

  afterEach(() => {
    checkIfUsersHaveFeatureSpy?.mockRestore();
    checkIfUserHasFeatureSpy?.mockRestore();
    checkIfFeatureIsEnabledGloballySpy?.mockRestore();
  });

  test("team event: uses single batch query for user feature checks, not N per-user queries", async () => {
    vi.setSystemTime(FAKED_NOW);
    setupSpies();

    await getSlots({
      eventTypeId: batchQueryTestData.eventType.id,
      startTime: `${testDate}T00:00:00.000Z`,
      endTime: `${testDate}T23:59:59.999Z`,
    });

    expect(checkIfUsersHaveFeatureSpy).toHaveBeenCalledTimes(1);
    expect(checkIfUserHasFeatureSpy).not.toHaveBeenCalled();
    expect(checkIfFeatureIsEnabledGloballySpy).toHaveBeenCalledTimes(1);
  });

  test("query count remains constant regardless of team size", async () => {
    vi.setSystemTime(FAKED_NOW);

    setupSpies();
    await getSlots({
      eventTypeId: batchQueryTestData.eventType.id,
      startTime: `${testDate}T00:00:00.000Z`,
      endTime: `${testDate}T23:59:59.999Z`,
    });
    const batchCallsWith4Users = checkIfUsersHaveFeatureSpy.mock.calls.length;
    const globalCallsWith4Users = checkIfFeatureIsEnabledGloballySpy.mock.calls.length;
    checkIfUsersHaveFeatureSpy.mockRestore();
    checkIfUserHasFeatureSpy.mockRestore();
    checkIfFeatureIsEnabledGloballySpy.mockRestore();

    const smallSuffix = `small-${Date.now()}`;
    const smallUsers = batchQueryTestData.members.slice(0, 2).map((m) => m.user);
    const { team: smallTeam, eventType: smallEventType } = await createTeamEventType({
      suffix: smallSuffix,
      users: smallUsers,
    });

    try {
      setupSpies();
      await getSlots({
        eventTypeId: smallEventType.id,
        startTime: `${testDate}T00:00:00.000Z`,
        endTime: `${testDate}T23:59:59.999Z`,
      });
      const batchCallsWith2Users = checkIfUsersHaveFeatureSpy.mock.calls.length;
      const globalCallsWith2Users = checkIfFeatureIsEnabledGloballySpy.mock.calls.length;

      expect(batchCallsWith2Users).toBe(batchCallsWith4Users);
      expect(globalCallsWith2Users).toBe(globalCallsWith4Users);
    } finally {
      await cleanupTeamEventType({ eventTypeId: smallEventType.id, teamId: smallTeam.id });
    }
  });
});

describe("prefetchCalendarCacheFlags returns correct Set based on feature flags", () => {
  let prefetchTestData: {
    enabledUser: User;
    disabledUser: User;
    allUsers: User[];
    schedules: Schedule[];
  };

  beforeAll(async () => {
    const suffix = `prefetch-${Date.now()}`;
    const enabledUser = await createTestUser(`${suffix}-enabled`);
    const disabledUser = await createTestUser(`${suffix}-disabled`);
    const allUsers = [enabledUser, disabledUser];
    const schedules = await Promise.all(allUsers.map((user) => createScheduleWithAvailability(user.id)));
    await enableFeatureForUser(enabledUser.id);
    prefetchTestData = { enabledUser, disabledUser, allUsers, schedules };
  });

  afterAll(async () => {
    vi.useRealTimers();
    const userIds = prefetchTestData.allUsers.map((u) => u.id);
    await prisma.userFeatures
      .deleteMany({ where: { userId: { in: userIds }, featureId: CALENDAR_CACHE_FEATURE } })
      .catch(() => {});
    await Promise.all(
      prefetchTestData.schedules.map((s) =>
        prisma.availability.deleteMany({ where: { scheduleId: s.id } }).catch(() => {})
      )
    );
    await Promise.all(
      prefetchTestData.schedules.map((s) =>
        prisma.schedule.deleteMany({ where: { id: s.id } }).catch(() => {})
      )
    );
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
  });

  const createPrefetchService = () =>
    new UserAvailabilityService({
      eventTypeRepo: {} as any,
      oooRepo: {} as any,
      bookingRepo: {} as any,
      redisClient: {} as any,
      holidayRepo: {} as any,
    });

  const toAvailabilityUsers = (users: User[]) =>
    users.map((u) => ({ ...u, id: u.id, username: u.username })) as any;

  test("includes only users with feature enabled in the returned Set", async () => {
    const service = createPrefetchService();

    const result = await service.prefetchCalendarCacheFlags({
      users: toAvailabilityUsers(prefetchTestData.allUsers),
      mode: "slots",
    });

    expect(result).toBeInstanceOf(Set);
    expect(result.has(prefetchTestData.enabledUser.id)).toBe(true);
    expect(result.has(prefetchTestData.disabledUser.id)).toBe(false);
  });

  test("returns empty Set in booking mode since cache is only used for slot availability", async () => {
    const service = createPrefetchService();

    const result = await service.prefetchCalendarCacheFlags({
      users: toAvailabilityUsers(prefetchTestData.allUsers),
      mode: "booking",
    });

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  test("returns empty Set when global feature flag is disabled, regardless of user-level flags", async () => {
    await prisma.feature.update({
      where: { slug: CALENDAR_CACHE_FEATURE },
      data: { enabled: false },
    });

    try {
      const service = createPrefetchService();

      const result = await service.prefetchCalendarCacheFlags({
        users: toAvailabilityUsers(prefetchTestData.allUsers),
        mode: "slots",
      });

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    } finally {
      await prisma.feature.update({
        where: { slug: CALENDAR_CACHE_FEATURE },
        data: { enabled: true },
      });
    }
  });
});
