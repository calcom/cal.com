import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { EventType, Schedule, Team, User } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { expect } from "./expects";

const createTestUser = async (overrides?: { name?: string; suffix?: string }) => {
  const timestamp = Date.now();
  const suffix = overrides?.suffix ?? timestamp.toString();
  return prisma.user.create({
    data: {
      username: `holiday-user-${suffix}`,
      name: overrides?.name ?? `Holiday User ${suffix}`,
      email: `holiday-user-${suffix}@example.com`,
    },
  });
};

const createTestScheduleWithAvailability = async (userId: number, overrides?: { name?: string }) => {
  const timestamp = Date.now();
  const schedule = await prisma.schedule.create({
    data: {
      name: overrides?.name ?? `Holiday Schedule ${timestamp}`,
      userId,
      timeZone: "UTC",
    },
  });

  await prisma.availability.create({
    data: {
      scheduleId: schedule.id,
      days: [1, 2, 3, 4, 5],
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

const createTestHolidayCacheEntry = async (overrides: {
  countryCode: string;
  calendarId: string;
  eventId: string;
  name: string;
  date: string;
  year: number;
}) => {
  return prisma.holidayCache.create({
    data: {
      countryCode: overrides.countryCode,
      calendarId: overrides.calendarId,
      eventId: overrides.eventId,
      name: overrides.name,
      date: new Date(`${overrides.date}T00:00:00.000Z`),
      year: overrides.year,
    },
  });
};

const createTestHolidaySettings = async (userId: number, countryCode: string) => {
  return prisma.userHolidaySettings.create({
    data: { userId, countryCode, disabledIds: [] },
  });
};

const createTestSoloEventType = async (userId: number) => {
  const timestamp = Date.now();
  return prisma.eventType.create({
    data: {
      title: `Holiday Solo Event ${timestamp}`,
      slug: `holiday-solo-event-${timestamp}`,
      length: 60,
      slotInterval: 60,
      userId,
      users: { connect: [{ id: userId }] },
    },
  });
};

const createTestTeamWithRoundRobin = async (userIds: number[]) => {
  const timestamp = Date.now();

  const team = await prisma.team.create({
    data: {
      name: `Holiday Team ${timestamp}`,
      slug: `holiday-team-${timestamp}`,
    },
  });

  await prisma.membership.createMany({
    data: userIds.map((userId, i) => ({
      userId,
      teamId: team.id,
      role: i === 0 ? MembershipRole.ADMIN : MembershipRole.MEMBER,
      accepted: true,
    })),
  });

  const eventType = await prisma.eventType.create({
    data: {
      title: `Holiday Team Event ${timestamp}`,
      slug: `holiday-team-event-${timestamp}`,
      length: 60,
      slotInterval: 60,
      teamId: team.id,
      userId: userIds[0],
      schedulingType: SchedulingType.ROUND_ROBIN,
      users: { connect: userIds.map((id) => ({ id })) },
      hosts: {
        createMany: {
          data: userIds.map((userId) => ({ userId, isFixed: false })),
        },
      },
    },
  });

  return { team, eventType };
};

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

const cleanupTestData = async (data: {
  eventTypeIds?: number[];
  userIds?: number[];
  scheduleIds?: number[];
  holidayCacheEventIds?: string[];
  holidayCacheCountryCodes?: string[];
  teamId?: number;
}) => {
  if (data.eventTypeIds?.length) {
    await prisma.host.deleteMany({ where: { eventTypeId: { in: data.eventTypeIds } } });
    await prisma.eventType.deleteMany({ where: { id: { in: data.eventTypeIds } } });
  }
  if (data.userIds?.length) {
    await prisma.userHolidaySettings.deleteMany({ where: { userId: { in: data.userIds } } });
  }
  if (data.holidayCacheEventIds?.length) {
    await prisma.holidayCache.deleteMany({ where: { eventId: { in: data.holidayCacheEventIds } } });
  }
  if (data.holidayCacheCountryCodes?.length) {
    await prisma.holidayCache.deleteMany({ where: { countryCode: { in: data.holidayCacheCountryCodes } } });
  }
  if (data.scheduleIds?.length) {
    await prisma.availability.deleteMany({ where: { scheduleId: { in: data.scheduleIds } } });
    await prisma.schedule.deleteMany({ where: { id: { in: data.scheduleIds } } });
  }
  if (data.teamId) {
    await prisma.membership.deleteMany({ where: { teamId: data.teamId } });
    await prisma.team.delete({ where: { id: data.teamId } }).catch(() => {});
  }
  if (data.userIds?.length) {
    await prisma.user.deleteMany({ where: { id: { in: data.userIds } } });
  }
};

const getSlots = async (input: {
  eventTypeId: number;
  startTime: string;
  endTime: string;
  isTeamEvent: boolean;
}) => {
  const availableSlotsService = getAvailableSlotsService();
  return availableSlotsService.getAvailableSlots({
    input: {
      eventTypeId: input.eventTypeId,
      eventTypeSlug: "",
      startTime: input.startTime,
      endTime: input.endTime,
      timeZone: "UTC",
      isTeamEvent: input.isTeamEvent,
      orgSlug: null,
    },
  });
};

const holidayDate = "2026-07-01";
const nonHolidayDate = "2026-07-02";

describe("getSchedule holidays (integration)", () => {
  let testData: {
    users: User[];
    schedules: Schedule[];
    soloEventType: EventType;
    team: Team;
    teamEventType: EventType;
  };

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "test-api-key");

    const users = await Promise.all([
      createTestUser({ suffix: `us-${Date.now()}` }),
      createTestUser({ suffix: `de-${Date.now()}` }),
    ]);

    const schedules = await Promise.all(users.map((u) => createTestScheduleWithAvailability(u.id)));

    await Promise.all([
      createTestHolidayCacheEntry({
        countryCode: "US",
        calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
        eventId: "test_us_holiday_1",
        name: "Test US Holiday",
        date: holidayDate,
        year: 2026,
      }),
      createTestHolidayCacheEntry({
        countryCode: "DE",
        calendarId: "en.german.official#holiday@group.v.calendar.google.com",
        eventId: "test_de_holiday_1",
        name: "Test DE Holiday",
        date: holidayDate,
        year: 2026,
      }),
    ]);

    await Promise.all([
      createTestHolidaySettings(users[0].id, "US"),
      createTestHolidaySettings(users[1].id, "DE"),
    ]);

    const soloEventType = await createTestSoloEventType(users[0].id);
    const { team, eventType: teamEventType } = await createTestTeamWithRoundRobin(users.map((u) => u.id));

    testData = { users, schedules, soloEventType, team, teamEventType };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupTestData({
      eventTypeIds: [testData.soloEventType?.id, testData.teamEventType?.id].filter(Boolean),
      userIds: testData.users?.map((u) => u.id),
      scheduleIds: testData.schedules?.map((s) => s.id),
      holidayCacheEventIds: ["test_us_holiday_1", "test_de_holiday_1"],
      teamId: testData.team?.id,
    });
  });

  test("should mark all slots as away on a holiday for a solo user", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const schedule = await getSlots({
      eventTypeId: testData.soloEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: false,
    });

    expect(schedule).toHaveAllSlotsAsHolidayOOO({ dateString: holidayDate, reason: "Test US Holiday" });
  });

  test("should return normal slots on a non-holiday date", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const schedule = await getSlots({
      eventTypeId: testData.soloEventType.id,
      startTime: `${nonHolidayDate}T00:00:00.000Z`,
      endTime: `${nonHolidayDate}T23:59:59.999Z`,
      isTeamEvent: false,
    });

    expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: nonHolidayDate });
  });

  test("should disable date when all round-robin hosts are on holiday", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const schedule = await getSlots({
      eventTypeId: testData.teamEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    // For team events, datesOutOfOffice is intentionally not passed to the slot builder
    // (see util.ts: `datesOutOfOffice: !isTeamEvent ? ... : undefined`). When all round-robin
    // hosts are on holiday, the date is simply removed from the response — there's no way to
    // distinguish holiday OOO from busy/unavailable at the API level for team events.
    expect(schedule).toHaveDateDisabled({ dateString: holidayDate });
  });

  test("should not block slots when user has disabled the holiday", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    await prisma.userHolidaySettings.update({
      where: { userId: testData.users[0].id },
      data: { disabledIds: ["test_us_holiday_1"] },
    });

    try {
      const schedule = await getSlots({
        eventTypeId: testData.soloEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${holidayDate}T23:59:59.999Z`,
        isTeamEvent: false,
      });

      expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: holidayDate });
    } finally {
      await prisma.userHolidaySettings.update({
        where: { userId: testData.users[0].id },
        data: { disabledIds: [] },
      });
    }
  });

  test("should handle team member with null countryCode gracefully", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    await prisma.userHolidaySettings.update({
      where: { userId: testData.users[1].id },
      data: { countryCode: null },
    });

    try {
      const schedule = await getSlots({
        eventTypeId: testData.teamEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${holidayDate}T23:59:59.999Z`,
        isTeamEvent: true,
      });

      // User1 has US holiday, user2 has null countryCode (no holidays).
      // In round-robin, user2 is still available, so slots should exist.
      expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: holidayDate });
    } finally {
      await prisma.userHolidaySettings.update({
        where: { userId: testData.users[1].id },
        data: { countryCode: "DE" },
      });
    }
  });

  test("should batch-fetch holidays for multiple country codes in team events", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const schedule = await getSlots({
      eventTypeId: testData.teamEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${nonHolidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    // Same as above: team events don't expose OOO metadata in slots, so we can only
    // assert the date is disabled (no slots), not that it's specifically holiday OOO.
    expect(schedule).toHaveDateDisabled({ dateString: holidayDate });
    expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: nonHolidayDate });
  });
});

describe("getSchedule holiday cache refresh (integration)", () => {
  const countryCode = "FJ";
  const calendarId = "en.fj.official#holiday@group.v.calendar.google.com";
  const originalFetch = globalThis.fetch;

  let testData: {
    user: User;
    schedule: Schedule;
    eventType: EventType;
  };

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "test-api-key");

    await prisma.holidayCache.deleteMany({ where: { countryCode } });

    const user = await createTestUser({ suffix: `fj-${Date.now()}` });
    const schedule = await createTestScheduleWithAvailability(user.id);
    await createTestHolidaySettings(user.id, countryCode);
    const eventType = await createTestSoloEventType(user.id);

    testData = { user, schedule, eventType };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterAll(async () => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    await cleanupTestData({
      eventTypeIds: [testData.eventType?.id],
      userIds: [testData.user?.id],
      scheduleIds: [testData.schedule?.id],
      holidayCacheCountryCodes: [countryCode],
    });
  });

  test("should fetch from Google API when cache is empty and populate DB", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const cacheBefore = await prisma.holidayCache.findMany({ where: { countryCode } });
    expect(cacheBefore).toHaveLength(0);

    const mockFetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          items: [
            {
              id: "fiji_independence_day",
              summary: "Fiji Independence Day",
              start: { date: holidayDate },
              end: { date: "2026-07-02" },
            },
          ],
        }),
    });
    globalThis.fetch = mockFetch;

    const result = await getSlots({
      eventTypeId: testData.eventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: false,
    });

    expect(mockFetch).toHaveBeenCalled();
    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain("googleapis.com/calendar/v3");
    expect(fetchUrl).toContain(encodeURIComponent(calendarId));

    const cacheAfter = await prisma.holidayCache.findMany({ where: { countryCode } });
    expect(cacheAfter.length).toBeGreaterThan(0);
    const fijiHoliday = cacheAfter.find((h) => h.eventId === "fiji_independence_day");
    expect(fijiHoliday).toBeDefined();
    expect(fijiHoliday!.name).toBe("Fiji Independence Day");

    expect(result).toHaveAllSlotsAsHolidayOOO({ dateString: holidayDate, reason: "Fiji Independence Day" });
  });
});
