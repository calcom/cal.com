import { afterAll, afterEach, beforeAll, beforeEach, describe, test, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";
import { getCalendarCredentials } from "@calcom/features/calendars/lib/CalendarManager";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { CachedFeatureRepository } from "@calcom/features/flags/repositories/CachedFeatureRepository";
import { PrismaUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import { prisma } from "@calcom/prisma";
import type { Credential, EventType, Schedule, Team, User } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { expect } from "./expects";

const WEEKDAY_HOURLY_SLOTS = [
  "09:00:00.000Z",
  "10:00:00.000Z",
  "11:00:00.000Z",
  "12:00:00.000Z",
  "13:00:00.000Z",
  "14:00:00.000Z",
  "15:00:00.000Z",
  "16:00:00.000Z",
];

/**
 * All test dates are computed relative to the real current time so the test
 * never drifts beyond the 3-month cache horizon used by CalendarCacheWrapper.
 */
function nextMonday(from: Date, minDaysAhead: number): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + minDaysAhead);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

const realNow = new Date();
realNow.setUTCHours(0, 0, 0, 0);

// FAKED_NOW: 7 days ahead of real time (gives room for sync date math)
const fakedNowDate = new Date(realNow);
fakedNowDate.setUTCDate(fakedNowDate.getUTCDate() + 7);
const FAKED_NOW = fakedNowDate.toISOString();

// Sync dates relative to FAKED_NOW
const FRESH_SYNC_DATE = new Date(fakedNowDate.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before
const STALE_SYNC_DATE = new Date(fakedNowDate.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days before (>7-day threshold)

const CALENDAR_CACHE_FEATURE = "calendar-subscription-cache";
const testDate = nextMonday(fakedNowDate, 14); // ~2 weeks after FAKED_NOW, well within 3-month horizon
const farFutureDate = nextMonday(fakedNowDate, 100); // ~3.3 months after FAKED_NOW, beyond 3-month horizon

type UserCalendarSetup = {
  user: User;
  schedule: Schedule;
  credential: Credential;
  selectedCalendarId: string;
};

const createTestUser = async (suffix: string) =>
  prisma.user.create({
    data: {
      username: `cache-test-user-${suffix}`,
      name: `Cache Test User ${suffix}`,
      email: `cache-test-user-${suffix}@example.com`,
    },
  });

const createScheduleWithAvailability = async (userId: number) => {
  const schedule = await prisma.schedule.create({
    data: { name: `Cache Test Schedule ${Date.now()}`, userId, timeZone: "UTC" },
  });
  await prisma.availability.create({
    data: {
      scheduleId: schedule.id,
      days: [1, 2, 3, 4, 5],
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T17:00:00.000Z"),
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { defaultScheduleId: schedule.id } });
  return schedule;
};

const createGoogleCalendarApp = async () =>
  prisma.app.upsert({
    where: { slug: "google-calendar" },
    update: {},
    create: { slug: "google-calendar", dirName: "googlecalendar", categories: ["calendar"], enabled: true },
  });

const createCredential = async (userId: number) =>
  prisma.credential.create({
    data: {
      type: "google_calendar",
      key: { access_token: "test", refresh_token: "test", token_type: "Bearer" },
      userId,
      appId: "google-calendar",
    },
  });

const createSelectedCalendarWithSync = async (opts: {
  userId: number;
  credentialId: number;
  externalId: string;
}) =>
  prisma.selectedCalendar.create({
    data: {
      userId: opts.userId,
      integration: "google_calendar",
      externalId: opts.externalId,
      credentialId: opts.credentialId,
      syncToken: "test-sync-token",
      syncSubscribedAt: FRESH_SYNC_DATE,
      syncedAt: FRESH_SYNC_DATE,
    },
  });

const enableFeatureForUser = async (userId: number) => {
  await prisma.feature.upsert({
    where: { slug: CALENDAR_CACHE_FEATURE },
    update: { enabled: true },
    create: {
      slug: CALENDAR_CACHE_FEATURE,
      enabled: true,
      type: "OPERATIONAL",
      description: "Calendar subscription cache for integration tests",
    },
  });
  await prisma.userFeatures.upsert({
    where: { userId_featureId: { userId, featureId: CALENDAR_CACHE_FEATURE } },
    update: { enabled: true },
    create: { userId, featureId: CALENDAR_CACHE_FEATURE, enabled: true, assignedBy: "integration-test" },
  });
};

const createSoloEventType = async (userId: number) => {
  const ts = Date.now();
  return prisma.eventType.create({
    data: {
      title: `Cache Solo Event ${ts}`,
      slug: `cache-solo-event-${ts}`,
      length: 60,
      slotInterval: 60,
      userId,
      users: { connect: [{ id: userId }] },
    },
  });
};

const seedCalendarCacheEvent = async (opts: {
  selectedCalendarId: string;
  externalId: string;
  start: Date;
  end: Date;
}) =>
  prisma.calendarCacheEvent.create({
    data: {
      selectedCalendarId: opts.selectedCalendarId,
      externalId: opts.externalId,
      externalEtag: `"etag-${opts.externalId}"`,
      start: opts.start,
      end: opts.end,
      status: "confirmed",
      summary: "Busy from cache",
    },
  });

const createUserWithCalendarSetup = async (
  suffix: string,
  overrides?: { enableFeature?: boolean }
): Promise<UserCalendarSetup> => {
  const user = await createTestUser(suffix);
  const [schedule, credential] = await Promise.all([
    createScheduleWithAvailability(user.id),
    createCredential(user.id),
  ]);
  if (overrides?.enableFeature !== false) {
    await enableFeatureForUser(user.id);
  }
  const selectedCalendar = await createSelectedCalendarWithSync({
    userId: user.id,
    credentialId: credential.id,
    externalId: `cal-${suffix}@group.calendar.google.com`,
  });
  return { user, schedule, credential, selectedCalendarId: selectedCalendar.id };
};

const buildCredentialForService = async (credentialId: number) => {
  const fullCredential = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    include: { user: { select: { email: true } } },
  });
  return {
    ...fullCredential,
    appName: "google-calendar" as const,
    delegatedToId: null,
    delegatedTo: null,
    invalid: false,
  };
};

const createTeamEventType = async (opts: { suffix: string; users: User[] }) => {
  const team = await prisma.team.create({
    data: { name: `Cache Team ${opts.suffix}`, slug: `cache-team-${opts.suffix}` },
  });
  await prisma.membership.createMany({
    data: opts.users.map((user, i) => ({
      userId: user.id,
      teamId: team.id,
      role: i === 0 ? MembershipRole.ADMIN : MembershipRole.MEMBER,
      accepted: true,
    })),
  });
  const eventType = await prisma.eventType.create({
    data: {
      title: `Cache Team Event ${opts.suffix}`,
      slug: `cache-team-event-${opts.suffix}`,
      length: 60,
      slotInterval: 60,
      teamId: team.id,
      userId: opts.users[0].id,
      schedulingType: SchedulingType.ROUND_ROBIN,
      users: { connect: opts.users.map((u) => ({ id: u.id })) },
      hosts: { createMany: { data: opts.users.map((u) => ({ userId: u.id, isFixed: false })) } },
    },
  });
  return { team, eventType };
};

const cleanupUserCalendarSetup = async (data: UserCalendarSetup) => {
  await prisma.calendarCacheEvent
    .deleteMany({ where: { selectedCalendarId: data.selectedCalendarId } })
    .catch(() => {});
  await Promise.all([
    prisma.selectedCalendar.deleteMany({ where: { id: data.selectedCalendarId } }).catch(() => {}),
    prisma.userFeatures
      .deleteMany({ where: { userId: data.user.id, featureId: CALENDAR_CACHE_FEATURE } })
      .catch(() => {}),
  ]);
  await Promise.all([
    prisma.credential.deleteMany({ where: { id: data.credential.id } }).catch(() => {}),
    prisma.availability.deleteMany({ where: { scheduleId: data.schedule.id } }).catch(() => {}),
  ]);
  await prisma.schedule.deleteMany({ where: { id: data.schedule.id } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: data.user.id } }).catch(() => {});
};

const cleanupTeamEventType = async (opts: { eventTypeId: number; teamId: number }) => {
  await prisma.host.deleteMany({ where: { eventTypeId: opts.eventTypeId } }).catch(() => {});
  await prisma.eventType.deleteMany({ where: { id: opts.eventTypeId } }).catch(() => {});
  await prisma.membership.deleteMany({ where: { teamId: opts.teamId } }).catch(() => {});
  await prisma.team.delete({ where: { id: opts.teamId } }).catch(() => {});
};

const getSlots = async (input: { eventTypeId: number; startTime: string; endTime: string }) => {
  const service = getAvailableSlotsService();
  return service.getAvailableSlots({
    input: {
      eventTypeId: input.eventTypeId,
      eventTypeSlug: "",
      startTime: input.startTime,
      endTime: input.endTime,
      timeZone: "UTC",
      isTeamEvent: false,
      orgSlug: null,
      _silentCalendarFailures: true,
    },
  });
};

const getSlotsForDate = (eventTypeId: number, dateString: string = testDate) =>
  getSlots({
    eventTypeId,
    startTime: `${dateString}T00:00:00.000Z`,
    endTime: `${dateString}T23:59:59.999Z`,
  });

const getTeamSlotsForDate = (eventTypeId: number, dateString: string = testDate) => {
  const service = getAvailableSlotsService();
  return service.getAvailableSlots({
    input: {
      eventTypeId,
      eventTypeSlug: "",
      startTime: `${dateString}T00:00:00.000Z`,
      endTime: `${dateString}T23:59:59.999Z`,
      timeZone: "UTC",
      isTeamEvent: true,
      orgSlug: null,
      _silentCalendarFailures: true,
    },
  });
};

const getDynamicSlotsForDate = (usernameList: string[], dateString: string = testDate) => {
  const service = getAvailableSlotsService();
  return service.getAvailableSlots({
    input: {
      usernameList,
      eventTypeSlug: "dynamic",
      startTime: `${dateString}T00:00:00.000Z`,
      endTime: `${dateString}T23:59:59.999Z`,
      timeZone: "UTC",
      isTeamEvent: false,
      orgSlug: null,
      _silentCalendarFailures: true,
    },
  });
};

const createSelectedCalendarWithoutSync = async (opts: {
  userId: number;
  credentialId: number;
  externalId: string;
}) =>
  prisma.selectedCalendar.create({
    data: {
      userId: opts.userId,
      integration: "google_calendar",
      externalId: opts.externalId,
      credentialId: opts.credentialId,
    },
  });

describe("getSchedule uses CalendarCacheEvents as busy times when calendar-subscription-cache is enabled", () => {
  let soloTestData: UserCalendarSetup & { eventType: EventType };

  beforeAll(async () => {
    await createGoogleCalendarApp();
    const setup = await createUserWithCalendarSetup(Date.now().toString());
    const eventType = await createSoloEventType(setup.user.id);
    soloTestData = { ...setup, eventType };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.eventType.deleteMany({ where: { id: soloTestData.eventType?.id } }).catch(() => {});
    await cleanupUserCalendarSetup(soloTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent.deleteMany({
      where: { selectedCalendarId: soloTestData.selectedCalendarId },
    });
  });

  test("removes slots that overlap with cached busy events", async () => {
    await seedCalendarCacheEvent({
      selectedCalendarId: soloTestData.selectedCalendarId,
      externalId: "busy-event-1",
      start: new Date(`${testDate}T10:00:00.000Z`),
      end: new Date(`${testDate}T15:00:00.000Z`),
    });

    const result = await getSlotsForDate(soloTestData.eventType.id);

    expect(result).toHaveTimeSlots(["09:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"], {
      dateString: testDate,
    });
  });

  test("returns all slots when no cached busy events exist for the date", async () => {
    const result = await getSlotsForDate(soloTestData.eventType.id);
    expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
  });

  test("cached events do not block slots when global feature flag is disabled", async () => {
    await seedCalendarCacheEvent({
      selectedCalendarId: soloTestData.selectedCalendarId,
      externalId: "busy-event-ff-disabled",
      start: new Date(`${testDate}T10:00:00.000Z`),
      end: new Date(`${testDate}T15:00:00.000Z`),
    });

    await prisma.feature.update({
      where: { slug: CALENDAR_CACHE_FEATURE },
      data: { enabled: false },
    });

    try {
      const result = await getSlotsForDate(soloTestData.eventType.id);
      expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
    } finally {
      await prisma.feature.update({
        where: { slug: CALENDAR_CACHE_FEATURE },
        data: { enabled: true },
      });
    }
  });

  describe("when the calendar sync is stale or incomplete, cache is not trusted", () => {
    test.each([
      {
        scenario: "syncedAt is stale (older than 7 days)",
        update: { syncedAt: STALE_SYNC_DATE },
        restore: { syncedAt: FRESH_SYNC_DATE },
      },
      {
        scenario: "syncToken is missing",
        update: { syncToken: null as string | null },
        restore: { syncToken: "test-sync-token" },
      },
      {
        scenario: "syncSubscribedAt is missing",
        update: { syncSubscribedAt: null as Date | null },
        restore: { syncSubscribedAt: FRESH_SYNC_DATE },
      },
    ])("cached events do not block slots when $scenario", async ({ update, restore }) => {
      await Promise.all([
        prisma.selectedCalendar.update({
          where: { id: soloTestData.selectedCalendarId },
          data: update,
        }),
        seedCalendarCacheEvent({
          selectedCalendarId: soloTestData.selectedCalendarId,
          externalId: "busy-event-sync-bypass",
          start: new Date(`${testDate}T10:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
      ]);

      try {
        const result = await getSlotsForDate(soloTestData.eventType.id);
        expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
      } finally {
        await prisma.selectedCalendar.update({
          where: { id: soloTestData.selectedCalendarId },
          data: restore,
        });
      }
    });

    test("cache is still trusted when syncedAt is null, as long as syncToken and syncSubscribedAt are present", async () => {
      await Promise.all([
        prisma.selectedCalendar.update({
          where: { id: soloTestData.selectedCalendarId },
          data: { syncedAt: null },
        }),
        seedCalendarCacheEvent({
          selectedCalendarId: soloTestData.selectedCalendarId,
          externalId: "busy-event-null-synced",
          start: new Date(`${testDate}T10:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
      ]);

      try {
        const result = await getSlotsForDate(soloTestData.eventType.id);
        expect(result).toHaveTimeSlots(["09:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"], {
          dateString: testDate,
        });
      } finally {
        await prisma.selectedCalendar.update({
          where: { id: soloTestData.selectedCalendarId },
          data: { syncedAt: FRESH_SYNC_DATE },
        });
      }
    });
  });

  describe("when the requested date is beyond the cache horizon", () => {
    test("cached events do not block slots for dates beyond the 3-month cache horizon", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: soloTestData.selectedCalendarId,
        externalId: "busy-event-far-future",
        start: new Date(`${farFutureDate}T10:00:00.000Z`),
        end: new Date(`${farFutureDate}T15:00:00.000Z`),
      });

      const result = await getSlotsForDate(soloTestData.eventType.id, farFutureDate);
      expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: farFutureDate });
    });
  });

  describe("when cached events have different time patterns", () => {
    test("removes slots for each separate busy period independently", async () => {
      await Promise.all([
        seedCalendarCacheEvent({
          selectedCalendarId: soloTestData.selectedCalendarId,
          externalId: "busy-morning-block",
          start: new Date(`${testDate}T09:00:00.000Z`),
          end: new Date(`${testDate}T10:00:00.000Z`),
        }),
        seedCalendarCacheEvent({
          selectedCalendarId: soloTestData.selectedCalendarId,
          externalId: "busy-afternoon-block",
          start: new Date(`${testDate}T14:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
      ]);

      const result = await getSlotsForDate(soloTestData.eventType.id);

      expect(result).toHaveTimeSlots(
        [
          "10:00:00.000Z",
          "11:00:00.000Z",
          "12:00:00.000Z",
          "13:00:00.000Z",
          "15:00:00.000Z",
          "16:00:00.000Z",
        ],
        { dateString: testDate }
      );
    });

    test("no slots available when a cached event spans the entire working day", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: soloTestData.selectedCalendarId,
        externalId: "busy-all-day",
        start: new Date(`${testDate}T08:00:00.000Z`),
        end: new Date(`${testDate}T18:00:00.000Z`),
      });

      const result = await getSlotsForDate(soloTestData.eventType.id);
      expect(result.slots[testDate] ?? []).toEqual([]);
    });

    test("all slots remain when a cached event falls outside working hours", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: soloTestData.selectedCalendarId,
        externalId: "busy-early-morning",
        start: new Date(`${testDate}T06:00:00.000Z`),
        end: new Date(`${testDate}T08:00:00.000Z`),
      });

      const result = await getSlotsForDate(soloTestData.eventType.id);
      expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
    });

    test("removes both slots when a cached event partially overlaps two consecutive slots", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: soloTestData.selectedCalendarId,
        externalId: "busy-partial-overlap",
        start: new Date(`${testDate}T09:30:00.000Z`),
        end: new Date(`${testDate}T10:30:00.000Z`),
      });

      const result = await getSlotsForDate(soloTestData.eventType.id);

      expect(result).toHaveTimeSlots(
        [
          "11:00:00.000Z",
          "12:00:00.000Z",
          "13:00:00.000Z",
          "14:00:00.000Z",
          "15:00:00.000Z",
          "16:00:00.000Z",
        ],
        { dateString: testDate }
      );
    });
  });

  describe("when per-user feature flag overrides the global setting", () => {
    test("cached events do not block slots when user-level flag is disabled even though global flag is enabled", async () => {
      await Promise.all([
        seedCalendarCacheEvent({
          selectedCalendarId: soloTestData.selectedCalendarId,
          externalId: "busy-event-user-ff",
          start: new Date(`${testDate}T10:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
        prisma.userFeatures.update({
          where: { userId_featureId: { userId: soloTestData.user.id, featureId: CALENDAR_CACHE_FEATURE } },
          data: { enabled: false },
        }),
      ]);

      try {
        const result = await getSlotsForDate(soloTestData.eventType.id);
        expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
      } finally {
        await prisma.userFeatures.update({
          where: { userId_featureId: { userId: soloTestData.user.id, featureId: CALENDAR_CACHE_FEATURE } },
          data: { enabled: true },
        });
      }
    });
  });
});

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
          in: [teamTestData.cacheEnabledMember.selectedCalendarId, teamTestData.cacheDisabledMember.selectedCalendarId],
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

describe("getCalendar uses batch-prefetched Set for O(1) cache decisions, falling back to per-credential FF when no Set is provided", () => {
  let batchTestData: UserCalendarSetup;

  beforeAll(async () => {
    await createGoogleCalendarApp();
    batchTestData = await createUserWithCalendarSetup(`batch-${Date.now()}`);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupUserCalendarSetup(batchTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent
      .deleteMany({ where: { selectedCalendarId: batchTestData.selectedCalendarId } })
      .catch(() => {});
  });

  test("wraps with CalendarCacheWrapper when user is in the batch-prefetched Set", async () => {
    const credentialForService = await buildCredentialForService(batchTestData.credential.id);

    const calendar = await getCalendar({
      credential: credentialForService,
      mode: "slots",
      calendarCacheEnabledForUserIds: new Set([batchTestData.user.id]),
    });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).toBe("CalendarCacheWrapper");
  });

  test("skips CalendarCacheWrapper when user is absent from the batch-prefetched Set", async () => {
    const credentialForService = await buildCredentialForService(batchTestData.credential.id);

    const calendar = await getCalendar({
      credential: credentialForService,
      mode: "slots",
      calendarCacheEnabledForUserIds: new Set<number>(),
    });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
  });

  test("falls back to per-credential FF check when no batch Set is provided", async () => {
    const credentialForService = await buildCredentialForService(batchTestData.credential.id);

    const calendar = await getCalendar({ credential: credentialForService, mode: "slots" });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).toBe("CalendarCacheWrapper");
  });
});

describe("getCalendarCredentials uses per-credential FF check (non-batch path)", () => {
  let credTestData: UserCalendarSetup;

  beforeAll(async () => {
    await createGoogleCalendarApp();
    credTestData = await createUserWithCalendarSetup(`cred-${Date.now()}`);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupUserCalendarSetup(credTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  test("wraps with CalendarCacheWrapper when feature flag is enabled for the user", async () => {
    const credentialForService = await buildCredentialForService(credTestData.credential.id);

    const calendarCredentials = getCalendarCredentials([credentialForService]);
    expect(calendarCredentials.length).toBe(1);

    const calendar = await calendarCredentials[0].calendar();
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).toBe("CalendarCacheWrapper");
  });

  test("skips CalendarCacheWrapper when feature flag is disabled globally", async () => {
    await prisma.feature.update({
      where: { slug: CALENDAR_CACHE_FEATURE },
      data: { enabled: false },
    });

    try {
      const credentialForService = await buildCredentialForService(credTestData.credential.id);

      const calendarCredentials = getCalendarCredentials([credentialForService]);
      expect(calendarCredentials.length).toBe(1);

      const calendar = await calendarCredentials[0].calendar();
      expect(calendar).not.toBeNull();
      expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
    } finally {
      await prisma.feature.update({
        where: { slug: CALENDAR_CACHE_FEATURE },
        data: { enabled: true },
      });
    }
  });
});

describe("getCalendar bypasses calendar cache in booking mode", () => {
  let bookingTestData: UserCalendarSetup;

  beforeAll(async () => {
    await createGoogleCalendarApp();
    bookingTestData = await createUserWithCalendarSetup(`booking-${Date.now()}`);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupUserCalendarSetup(bookingTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  test("skips CalendarCacheWrapper in booking mode even when feature flag is enabled", async () => {
    const credentialForService = await buildCredentialForService(bookingTestData.credential.id);

    const calendar = await getCalendar({ credential: credentialForService, mode: "booking" });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
  });

  test("skips CalendarCacheWrapper in booking mode even when batch-prefetched Set includes the user", async () => {
    const credentialForService = await buildCredentialForService(bookingTestData.credential.id);

    const calendar = await getCalendar({
      credential: credentialForService,
      mode: "booking",
      calendarCacheEnabledForUserIds: new Set([bookingTestData.user.id]),
    });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
  });
});

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

describe("getSchedule handles multiple synced calendars per user", () => {
  let multiCalTestData: UserCalendarSetup & {
    eventType: EventType;
    secondSyncedCalendarId: string;
  };

  beforeAll(async () => {
    const suffix = `multi-cal-${Date.now()}`;
    await createGoogleCalendarApp();
    const setup = await createUserWithCalendarSetup(suffix);
    const eventType = await createSoloEventType(setup.user.id);
    const secondSyncedCalendar = await createSelectedCalendarWithSync({
      userId: setup.user.id,
      credentialId: setup.credential.id,
      externalId: `second-synced-${suffix}@group.calendar.google.com`,
    });
    multiCalTestData = { ...setup, eventType, secondSyncedCalendarId: secondSyncedCalendar.id };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.calendarCacheEvent
      .deleteMany({ where: { selectedCalendarId: multiCalTestData.secondSyncedCalendarId } })
      .catch(() => {});
    await prisma.selectedCalendar
      .deleteMany({ where: { id: multiCalTestData.secondSyncedCalendarId } })
      .catch(() => {});
    await prisma.eventType.deleteMany({ where: { id: multiCalTestData.eventType.id } }).catch(() => {});
    await cleanupUserCalendarSetup(multiCalTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent.deleteMany({
      where: {
        selectedCalendarId: {
          in: [multiCalTestData.selectedCalendarId, multiCalTestData.secondSyncedCalendarId],
        },
      },
    });
  });

  test("events from both synced calendars block slots independently", async () => {
    await Promise.all([
      seedCalendarCacheEvent({
        selectedCalendarId: multiCalTestData.selectedCalendarId,
        externalId: "first-cal-busy",
        start: new Date(`${testDate}T09:00:00.000Z`),
        end: new Date(`${testDate}T10:00:00.000Z`),
      }),
      seedCalendarCacheEvent({
        selectedCalendarId: multiCalTestData.secondSyncedCalendarId,
        externalId: "second-cal-busy",
        start: new Date(`${testDate}T14:00:00.000Z`),
        end: new Date(`${testDate}T15:00:00.000Z`),
      }),
    ]);

    const result = await getSlotsForDate(multiCalTestData.eventType.id);

    expect(result).toHaveTimeSlots(
      ["10:00:00.000Z", "11:00:00.000Z", "12:00:00.000Z", "13:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"],
      { dateString: testDate }
    );
  });

  test("events on only one of multiple synced calendars still block the corresponding slots", async () => {
    await seedCalendarCacheEvent({
      selectedCalendarId: multiCalTestData.secondSyncedCalendarId,
      externalId: "second-cal-only-busy",
      start: new Date(`${testDate}T11:00:00.000Z`),
      end: new Date(`${testDate}T13:00:00.000Z`),
    });

    const result = await getSlotsForDate(multiCalTestData.eventType.id);

    expect(result).toHaveTimeSlots(
      ["09:00:00.000Z", "10:00:00.000Z", "13:00:00.000Z", "14:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"],
      { dateString: testDate }
    );
  });
});

describe("getSchedule falls back gracefully when cache-enabled user has no synced calendars", () => {
  let noSyncTestData: {
    user: User;
    schedule: Schedule;
    credential: Credential;
    unsyncedCalendarId: string;
    eventType: EventType;
  };

  beforeAll(async () => {
    const suffix = `no-sync-${Date.now()}`;
    await createGoogleCalendarApp();
    const user = await createTestUser(suffix);
    const [schedule, credential] = await Promise.all([
      createScheduleWithAvailability(user.id),
      createCredential(user.id),
    ]);
    await enableFeatureForUser(user.id);
    const unsyncedCalendar = await createSelectedCalendarWithoutSync({
      userId: user.id,
      credentialId: credential.id,
      externalId: `no-sync-${suffix}@group.calendar.google.com`,
    });
    const eventType = await createSoloEventType(user.id);
    noSyncTestData = {
      user,
      schedule,
      credential,
      unsyncedCalendarId: unsyncedCalendar.id,
      eventType,
    };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.calendarCacheEvent
      .deleteMany({ where: { selectedCalendarId: noSyncTestData.unsyncedCalendarId } })
      .catch(() => {});
    await prisma.eventType.deleteMany({ where: { id: noSyncTestData.eventType.id } }).catch(() => {});
    await prisma.selectedCalendar
      .deleteMany({ where: { id: noSyncTestData.unsyncedCalendarId } })
      .catch(() => {});
    await prisma.userFeatures
      .deleteMany({ where: { userId: noSyncTestData.user.id, featureId: CALENDAR_CACHE_FEATURE } })
      .catch(() => {});
    await prisma.credential.deleteMany({ where: { id: noSyncTestData.credential.id } }).catch(() => {});
    await prisma.availability
      .deleteMany({ where: { scheduleId: noSyncTestData.schedule.id } })
      .catch(() => {});
    await prisma.schedule.deleteMany({ where: { id: noSyncTestData.schedule.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: noSyncTestData.user.id } }).catch(() => {});
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent
      .deleteMany({ where: { selectedCalendarId: noSyncTestData.unsyncedCalendarId } })
      .catch(() => {});
  });

  test("all slots available when cache-enabled user has only unsynced calendars", async () => {
    await seedCalendarCacheEvent({
      selectedCalendarId: noSyncTestData.unsyncedCalendarId,
      externalId: "no-sync-busy",
      start: new Date(`${testDate}T09:00:00.000Z`),
      end: new Date(`${testDate}T17:00:00.000Z`),
    });

    const result = await getSlotsForDate(noSyncTestData.eventType.id);

    // Cache events exist in DB but are not queried because the calendar isn't synced
    expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
  });
});
