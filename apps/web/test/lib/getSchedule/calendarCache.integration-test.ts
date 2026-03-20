import { afterAll, afterEach, beforeAll, beforeEach, describe, test, vi } from "vitest";

vi.hoisted(function disableUpstashMemoization() {
  process.env.UPSTASH_REDIS_REST_URL = "";
  process.env.UPSTASH_REDIS_REST_TOKEN = "";
});

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { Credential, EventType, Schedule, SelectedCalendar, User } from "@calcom/prisma/client";

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

const FAKED_NOW = "2026-06-25T00:00:00Z";
const FRESH_SYNC_DATE = new Date("2026-06-24T00:00:00Z");
const STALE_SYNC_DATE = new Date("2026-06-17T00:00:00Z");
const CALENDAR_CACHE_FEATURE = "calendar-subscription-cache";
const testDate = "2026-07-06"; // Monday, within 3 months of FAKED_NOW
const farFutureDate = "2026-10-05"; // Monday, >3 months from FAKED_NOW

const createTestUser = async (suffix: string) => {
  return prisma.user.create({
    data: {
      username: `cache-test-user-${suffix}`,
      name: `Cache Test User ${suffix}`,
      email: `cache-test-user-${suffix}@example.com`,
    },
  });
};

const createScheduleWithAvailability = async (userId: number) => {
  const schedule = await prisma.schedule.create({
    data: {
      name: `Cache Test Schedule ${Date.now()}`,
      userId,
      timeZone: "UTC",
    },
  });

  await prisma.availability.create({
    data: {
      scheduleId: schedule.id,
      days: [1, 2, 3, 4, 5], // Mon-Fri
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T17:00:00.000Z"),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { defaultScheduleId: schedule.id },
  });

  return schedule;
};

const createGoogleCalendarApp = async () => {
  await prisma.app.upsert({
    where: { slug: "google-calendar" },
    update: {},
    create: {
      slug: "google-calendar",
      dirName: "googlecalendar",
      categories: ["calendar"],
      enabled: true,
    },
  });
};

const createCredential = async (userId: number) => {
  return prisma.credential.create({
    data: {
      type: "google_calendar",
      key: { access_token: "test", refresh_token: "test", token_type: "Bearer" },
      userId,
      appId: "google-calendar",
    },
  });
};

const createSelectedCalendarWithSync = async (opts: {
  userId: number;
  credentialId: number;
  externalId: string;
}) => {
  return prisma.selectedCalendar.create({
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
};

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
    create: {
      userId,
      featureId: CALENDAR_CACHE_FEATURE,
      enabled: true,
      assignedBy: "integration-test",
    },
  });
};

const createSoloEventType = async (userId: number) => {
  const timestamp = Date.now();
  return prisma.eventType.create({
    data: {
      title: `Cache Solo Event ${timestamp}`,
      slug: `cache-solo-event-${timestamp}`,
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
}) => {
  return prisma.calendarCacheEvent.create({
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
};

const getSlots = async (input: { eventTypeId: number; startTime: string; endTime: string }) => {
  const availableSlotsService = getAvailableSlotsService();
  return availableSlotsService.getAvailableSlots({
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

const cleanupTestData = async (data: typeof testData) => {
  vi.useRealTimers();
  await Promise.all([
    prisma.calendarCacheEvent.deleteMany({ where: { selectedCalendarId: data.selectedCalendarId } }).catch(() => {}),
    prisma.eventType.deleteMany({ where: { id: data.eventType?.id } }).catch(() => {}),
    prisma.userFeatures
      .deleteMany({ where: { userId: data.user?.id, featureId: CALENDAR_CACHE_FEATURE } })
      .catch(() => {}),
  ]);
  await prisma.selectedCalendar.deleteMany({ where: { id: data.selectedCalendarId } }).catch(() => {});
  await Promise.all([
    prisma.credential.deleteMany({ where: { id: data.credential?.id } }).catch(() => {}),
    prisma.availability.deleteMany({ where: { scheduleId: data.schedule?.id } }).catch(() => {}),
  ]);
  await prisma.schedule.deleteMany({ where: { id: data.schedule?.id } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: data.user?.id } }).catch(() => {});
};

let testData: {
  user: User;
  schedule: Schedule;
  credential: Credential;
  selectedCalendarId: string;
  eventType: EventType;
};

describe("getSchedule uses CalendarCacheEvents as busy times when calendar-subscription-cache is enabled", () => {
  beforeAll(async () => {
    const suffix = Date.now().toString();
    const user = await createTestUser(suffix);

    await createGoogleCalendarApp();
    const [schedule, credential] = await Promise.all([
      createScheduleWithAvailability(user.id),
      createCredential(user.id),
      enableFeatureForUser(user.id),
    ]);

    const [selectedCalendar, eventType] = await Promise.all([
      createSelectedCalendarWithSync({
        userId: user.id,
        credentialId: credential.id,
        externalId: `test-calendar-${suffix}@group.calendar.google.com`,
      }),
      createSoloEventType(user.id),
    ]);

    testData = {
      user,
      schedule,
      credential,
      selectedCalendarId: selectedCalendar.id,
      eventType,
    };
  });

  afterAll(async () => {
    await cleanupTestData(testData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent.deleteMany({ where: { selectedCalendarId: testData.selectedCalendarId } });
  });

  test("should remove slots that overlap with cached busy events", async () => {
    await seedCalendarCacheEvent({
      selectedCalendarId: testData.selectedCalendarId,
      externalId: "busy-event-1",
      start: new Date(`${testDate}T10:00:00.000Z`),
      end: new Date(`${testDate}T15:00:00.000Z`),
    });

    const result = await getSlotsForDate(testData.eventType.id);

    expect(result).toHaveTimeSlots(["09:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"], {
      dateString: testDate,
    });
  });

  test("should return all slots when no cached busy events exist for the date", async () => {
    const result = await getSlotsForDate(testData.eventType.id);
    expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
  });

  test("should ignore cached events and fall back to live calendar when feature flag is disabled", async () => {
    await seedCalendarCacheEvent({
      selectedCalendarId: testData.selectedCalendarId,
      externalId: "busy-event-ff-disabled",
      start: new Date(`${testDate}T10:00:00.000Z`),
      end: new Date(`${testDate}T15:00:00.000Z`),
    });

    await prisma.feature.update({
      where: { slug: CALENDAR_CACHE_FEATURE },
      data: { enabled: false },
    });

    try {
      const result = await getSlotsForDate(testData.eventType.id);

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
    ])("should fall back to live calendar when $scenario", async ({ update, restore }) => {
      await Promise.all([
        prisma.selectedCalendar.update({
          where: { id: testData.selectedCalendarId },
          data: update,
        }),
        seedCalendarCacheEvent({
          selectedCalendarId: testData.selectedCalendarId,
          externalId: "busy-event-sync-bypass",
          start: new Date(`${testDate}T10:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
      ]);

      try {
        const result = await getSlotsForDate(testData.eventType.id);
        expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
      } finally {
        await prisma.selectedCalendar.update({
          where: { id: testData.selectedCalendarId },
          data: restore,
        });
      }
    });

    test("should trust cache when syncedAt is null as long as syncToken and syncSubscribedAt are present", async () => {
      await Promise.all([
        prisma.selectedCalendar.update({
          where: { id: testData.selectedCalendarId },
          data: { syncedAt: null },
        }),
        seedCalendarCacheEvent({
          selectedCalendarId: testData.selectedCalendarId,
          externalId: "busy-event-null-synced",
          start: new Date(`${testDate}T10:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
      ]);

      try {
        const result = await getSlotsForDate(testData.eventType.id);

        expect(result).toHaveTimeSlots(["09:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"], {
          dateString: testDate,
        });
      } finally {
        await prisma.selectedCalendar.update({
          where: { id: testData.selectedCalendarId },
          data: { syncedAt: FRESH_SYNC_DATE },
        });
      }
    });
  });

  describe("when the requested date is beyond the cache horizon", () => {
    test("should fall back to live calendar for dates more than 3 months in the future", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: testData.selectedCalendarId,
        externalId: "busy-event-far-future",
        start: new Date(`${farFutureDate}T10:00:00.000Z`),
        end: new Date(`${farFutureDate}T15:00:00.000Z`),
      });

      const result = await getSlotsForDate(testData.eventType.id, farFutureDate);
      expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: farFutureDate });
    });
  });

  describe("when cached events have different time patterns", () => {
    test("should remove slots for each separate busy period independently", async () => {
      await Promise.all([
        seedCalendarCacheEvent({
          selectedCalendarId: testData.selectedCalendarId,
          externalId: "busy-morning-block",
          start: new Date(`${testDate}T09:00:00.000Z`),
          end: new Date(`${testDate}T10:00:00.000Z`),
        }),
        seedCalendarCacheEvent({
          selectedCalendarId: testData.selectedCalendarId,
          externalId: "busy-afternoon-block",
          start: new Date(`${testDate}T14:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
      ]);

      const result = await getSlotsForDate(testData.eventType.id);

      expect(result).toHaveTimeSlots(
        ["10:00:00.000Z", "11:00:00.000Z", "12:00:00.000Z", "13:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"],
        { dateString: testDate }
      );
    });

    test("should show no availability when a cached event spans the entire working day", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: testData.selectedCalendarId,
        externalId: "busy-all-day",
        start: new Date(`${testDate}T08:00:00.000Z`),
        end: new Date(`${testDate}T18:00:00.000Z`),
      });

      const result = await getSlotsForDate(testData.eventType.id);

      const slotsForDate = result.slots[testDate];
      expect(slotsForDate ?? []).toEqual([]);
    });

    test("should not reduce availability when a cached event falls outside working hours", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: testData.selectedCalendarId,
        externalId: "busy-early-morning",
        start: new Date(`${testDate}T06:00:00.000Z`),
        end: new Date(`${testDate}T08:00:00.000Z`),
      });

      const result = await getSlotsForDate(testData.eventType.id);
      expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
    });

    test("should remove both slots when a cached event partially overlaps two consecutive slots", async () => {
      await seedCalendarCacheEvent({
        selectedCalendarId: testData.selectedCalendarId,
        externalId: "busy-partial-overlap",
        start: new Date(`${testDate}T09:30:00.000Z`),
        end: new Date(`${testDate}T10:30:00.000Z`),
      });

      const result = await getSlotsForDate(testData.eventType.id);

      expect(result).toHaveTimeSlots(
        ["11:00:00.000Z", "12:00:00.000Z", "13:00:00.000Z", "14:00:00.000Z", "15:00:00.000Z", "16:00:00.000Z"],
        { dateString: testDate }
      );
    });
  });

  describe("when per-user feature flag overrides the global setting", () => {
    test("should fall back to live calendar when user-level flag is disabled even though global flag is enabled", async () => {
      await Promise.all([
        seedCalendarCacheEvent({
          selectedCalendarId: testData.selectedCalendarId,
          externalId: "busy-event-user-ff",
          start: new Date(`${testDate}T10:00:00.000Z`),
          end: new Date(`${testDate}T15:00:00.000Z`),
        }),
        prisma.userFeatures.update({
          where: { userId_featureId: { userId: testData.user.id, featureId: CALENDAR_CACHE_FEATURE } },
          data: { enabled: false },
        }),
      ]);

      try {
        const result = await getSlotsForDate(testData.eventType.id);
        expect(result).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: testDate });
      } finally {
        await prisma.userFeatures.update({
          where: { userId_featureId: { userId: testData.user.id, featureId: CALENDAR_CACHE_FEATURE } },
          data: { enabled: true },
        });
      }
    });
  });
});
