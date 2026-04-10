import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { PrismaHolidayRepository } from "@calcom/features/holidays/repositories/PrismaHolidayRepository";
import { HolidayService } from "@calcom/features/holidays/holiday-service";
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

const createTestTeamEvent = async (
  userIds: number[],
  schedulingType: (typeof SchedulingType)["ROUND_ROBIN"] | (typeof SchedulingType)["COLLECTIVE"]
) => {
  const timestamp = Date.now();
  const label = schedulingType === SchedulingType.ROUND_ROBIN ? "rr" : "collective";

  const team = await prisma.team.create({
    data: {
      name: `Holiday Team ${label} ${timestamp}`,
      slug: `holiday-team-${label}-${timestamp}`,
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

  const isFixed = schedulingType === SchedulingType.COLLECTIVE;

  const eventType = await prisma.eventType.create({
    data: {
      title: `Holiday Team Event ${label} ${timestamp}`,
      slug: `holiday-team-event-${label}-${timestamp}`,
      length: 60,
      slotInterval: 60,
      teamId: team.id,
      userId: userIds[0],
      schedulingType,
      users: { connect: userIds.map((id) => ({ id })) },
      hosts: {
        createMany: {
          data: userIds.map((userId) => ({ userId, isFixed })),
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
// 2026-07-04 is a Saturday — not a working day for the default Mon–Fri schedule
const holidayOnWeekend = "2026-07-04";

describe("getSchedule holidays (integration)", () => {
  let testData: {
    users: User[];
    schedules: Schedule[];
    soloEventType: EventType;
    rrTeam: Team;
    rrEventType: EventType;
    collectiveTeam: Team;
    collectiveEventType: EventType;
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
      // Holiday that falls on a Saturday (non-working day)
      createTestHolidayCacheEntry({
        countryCode: "US",
        calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
        eventId: "test_us_holiday_weekend",
        name: "Test US Weekend Holiday",
        date: holidayOnWeekend,
        year: 2026,
      }),
    ]);

    await Promise.all([
      createTestHolidaySettings(users[0].id, "US"),
      createTestHolidaySettings(users[1].id, "DE"),
    ]);

    const soloEventType = await createTestSoloEventType(users[0].id);
    const { team: rrTeam, eventType: rrEventType } = await createTestTeamEvent(
      users.map((u) => u.id),
      SchedulingType.ROUND_ROBIN
    );
    const { team: collectiveTeam, eventType: collectiveEventType } = await createTestTeamEvent(
      users.map((u) => u.id),
      SchedulingType.COLLECTIVE
    );

    testData = { users, schedules, soloEventType, rrTeam, rrEventType, collectiveTeam, collectiveEventType };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupTestData({
      eventTypeIds: [
        testData.soloEventType?.id,
        testData.rrEventType?.id,
        testData.collectiveEventType?.id,
      ].filter(Boolean),
      userIds: testData.users?.map((u) => u.id),
      scheduleIds: testData.schedules?.map((s) => s.id),
      holidayCacheEventIds: ["test_us_holiday_1", "test_de_holiday_1", "test_us_holiday_weekend"],
      teamId: testData.rrTeam?.id,
    });
    // Clean up collective team separately since cleanupTestData only takes one teamId
    if (testData.collectiveTeam?.id) {
      await prisma.membership.deleteMany({ where: { teamId: testData.collectiveTeam.id } });
      await prisma.team.delete({ where: { id: testData.collectiveTeam.id } }).catch(() => {});
    }
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
      eventTypeId: testData.rrEventType.id,
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
        eventTypeId: testData.rrEventType.id,
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
      eventTypeId: testData.rrEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${nonHolidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    // Same as above: team events don't expose OOO metadata in slots, so we can only
    // assert the date is disabled (no slots), not that it's specifically holiday OOO.
    expect(schedule).toHaveDateDisabled({ dateString: holidayDate });
    expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: nonHolidayDate });
  });

  // --- Collective scheduling tests ---

  test("collective: should disable date when all hosts are on holiday", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const schedule = await getSlots({
      eventTypeId: testData.collectiveEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    // Collective requires ALL hosts to be available (intersection of availabilities).
    // Both hosts are on holiday (US & DE), so no slots should be available.
    expect(schedule).toHaveDateDisabled({ dateString: holidayDate });
  });

  test("collective: should disable date when even one host is on holiday", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    // Remove DE holiday so only user1 (US) is on holiday
    await prisma.userHolidaySettings.update({
      where: { userId: testData.users[1].id },
      data: { countryCode: null },
    });

    try {
      const schedule = await getSlots({
        eventTypeId: testData.collectiveEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${holidayDate}T23:59:59.999Z`,
        isTeamEvent: true,
      });

      // Collective intersects availability — user1 is on holiday, so the intersection
      // is empty even though user2 is free. Date should be disabled.
      expect(schedule).toHaveDateDisabled({ dateString: holidayDate });
    } finally {
      await prisma.userHolidaySettings.update({
        where: { userId: testData.users[1].id },
        data: { countryCode: "DE" },
      });
    }
  });

  test("collective: should return normal slots on non-holiday date", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const schedule = await getSlots({
      eventTypeId: testData.collectiveEventType.id,
      startTime: `${nonHolidayDate}T00:00:00.000Z`,
      endTime: `${nonHolidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: nonHolidayDate });
  });

  test("collective: should return normal slots when both hosts have disabled the holiday", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    await Promise.all([
      prisma.userHolidaySettings.update({
        where: { userId: testData.users[0].id },
        data: { disabledIds: ["test_us_holiday_1"] },
      }),
      prisma.userHolidaySettings.update({
        where: { userId: testData.users[1].id },
        data: { disabledIds: ["test_de_holiday_1"] },
      }),
    ]);

    try {
      const schedule = await getSlots({
        eventTypeId: testData.collectiveEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${holidayDate}T23:59:59.999Z`,
        isTeamEvent: true,
      });

      // Both users disabled their holiday, so both are available → intersection has slots.
      expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: holidayDate });
    } finally {
      await Promise.all([
        prisma.userHolidaySettings.update({
          where: { userId: testData.users[0].id },
          data: { disabledIds: [] },
        }),
        prisma.userHolidaySettings.update({
          where: { userId: testData.users[1].id },
          data: { disabledIds: [] },
        }),
      ]);
    }
  });

  // --- Mixed holiday states across team members ---

  test("should handle mixed holiday states: one user with holidays, one without settings", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    // Delete user2's holiday settings entirely (simulates a user who never configured holidays)
    await prisma.userHolidaySettings.delete({
      where: { userId: testData.users[1].id },
    });

    try {
      const schedule = await getSlots({
        eventTypeId: testData.rrEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${holidayDate}T23:59:59.999Z`,
        isTeamEvent: true,
      });

      // Round-robin: user1 is on US holiday, user2 has no holiday settings at all.
      // user2 is available, so slots should exist.
      expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: holidayDate });
    } finally {
      await createTestHolidaySettings(testData.users[1].id, "DE");
    }
  });

  test("collective: should disable date when one host has holiday and other has no holiday settings", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    await prisma.userHolidaySettings.delete({
      where: { userId: testData.users[1].id },
    });

    try {
      const schedule = await getSlots({
        eventTypeId: testData.collectiveEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${holidayDate}T23:59:59.999Z`,
        isTeamEvent: true,
      });

      // Collective: user1 is on US holiday (unavailable), user2 has no settings (available).
      // Intersection is empty because user1 is blocked → date disabled.
      expect(schedule).toHaveDateDisabled({ dateString: holidayDate });
    } finally {
      await createTestHolidaySettings(testData.users[1].id, "DE");
    }
  });

  // --- Partial disabledIds filtering ---

  test("should only block non-disabled holidays when user has partially disabled holidays", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    // Add a second US holiday on nonHolidayDate so we can test partial disabling
    await createTestHolidayCacheEntry({
      countryCode: "US",
      calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
      eventId: "test_us_holiday_2",
      name: "Test US Holiday 2",
      date: nonHolidayDate,
      year: 2026,
    });

    // Disable only the first holiday, leave the second enabled
    await prisma.userHolidaySettings.update({
      where: { userId: testData.users[0].id },
      data: { disabledIds: ["test_us_holiday_1"] },
    });

    try {
      const schedule = await getSlots({
        eventTypeId: testData.soloEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${nonHolidayDate}T23:59:59.999Z`,
        isTeamEvent: false,
      });

      // holidayDate: test_us_holiday_1 is disabled → normal slots
      expect(schedule).toHaveTimeSlots(WEEKDAY_HOURLY_SLOTS, { dateString: holidayDate });
      // nonHolidayDate: test_us_holiday_2 is NOT disabled → holiday OOO
      expect(schedule).toHaveAllSlotsAsHolidayOOO({
        dateString: nonHolidayDate,
        reason: "Test US Holiday 2",
      });
    } finally {
      await prisma.userHolidaySettings.update({
        where: { userId: testData.users[0].id },
        data: { disabledIds: [] },
      });
      await prisma.holidayCache.deleteMany({ where: { eventId: "test_us_holiday_2" } });
    }
  });

  // --- Holiday on non-working day ---

  test("should not affect availability when holiday falls on a non-working day (weekend)", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const schedule = await getSlots({
      eventTypeId: testData.soloEventType.id,
      startTime: `${holidayOnWeekend}T00:00:00.000Z`,
      endTime: `${holidayOnWeekend}T23:59:59.999Z`,
      isTeamEvent: false,
    });

    // 2026-07-04 is Saturday — already not a working day (Mon–Fri schedule).
    // The holiday shouldn't change the behavior; the date is disabled because it's a weekend.
    expect(schedule).toHaveDateDisabled({ dateString: holidayOnWeekend });
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

describe("getSchedule holiday N+1 regression (integration)", () => {
  let testData: {
    users: User[];
    schedules: Schedule[];
    soloEventType: EventType;
    rrTeam: Team;
    rrEventType: EventType;
    collectiveTeam: Team;
    collectiveEventType: EventType;
  };

  // Spies — set up before each test, restored after
  let findManyUserSettingsSpy: ReturnType<typeof vi.spyOn>;
  let findUserSettingsSelectSpy: ReturnType<typeof vi.spyOn>;
  let getHolidayDatesInRangeForCountriesSpy: ReturnType<typeof vi.spyOn>;
  let getHolidayDatesInRangeSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "test-api-key");

    const users = await Promise.all([
      createTestUser({ suffix: `n1-us-${Date.now()}` }),
      createTestUser({ suffix: `n1-de-${Date.now()}` }),
      createTestUser({ suffix: `n1-us2-${Date.now()}` }),
      createTestUser({ suffix: `n1-de2-${Date.now()}` }),
    ]);

    const schedules = await Promise.all(users.map((u) => createTestScheduleWithAvailability(u.id)));

    await Promise.all([
      createTestHolidayCacheEntry({
        countryCode: "US",
        calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
        eventId: "n1_us_holiday",
        name: "N1 Test US Holiday",
        date: holidayDate,
        year: 2026,
      }),
      createTestHolidayCacheEntry({
        countryCode: "DE",
        calendarId: "en.german.official#holiday@group.v.calendar.google.com",
        eventId: "n1_de_holiday",
        name: "N1 Test DE Holiday",
        date: holidayDate,
        year: 2026,
      }),
    ]);

    // 2 users in US, 2 users in DE — tests country-level deduplication
    await Promise.all([
      createTestHolidaySettings(users[0].id, "US"),
      createTestHolidaySettings(users[1].id, "DE"),
      createTestHolidaySettings(users[2].id, "US"),
      createTestHolidaySettings(users[3].id, "DE"),
    ]);

    const soloEventType = await createTestSoloEventType(users[0].id);
    const { team: rrTeam, eventType: rrEventType } = await createTestTeamEvent(
      users.map((u) => u.id),
      SchedulingType.ROUND_ROBIN
    );
    const { team: collectiveTeam, eventType: collectiveEventType } = await createTestTeamEvent(
      users.map((u) => u.id),
      SchedulingType.COLLECTIVE
    );

    testData = { users, schedules, soloEventType, rrTeam, rrEventType, collectiveTeam, collectiveEventType };
  });

  afterEach(() => {
    findManyUserSettingsSpy?.mockRestore();
    findUserSettingsSelectSpy?.mockRestore();
    getHolidayDatesInRangeForCountriesSpy?.mockRestore();
    getHolidayDatesInRangeSpy?.mockRestore();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupTestData({
      eventTypeIds: [
        testData.soloEventType?.id,
        testData.rrEventType?.id,
        testData.collectiveEventType?.id,
      ].filter(Boolean),
      userIds: testData.users?.map((u) => u.id),
      scheduleIds: testData.schedules?.map((s) => s.id),
      holidayCacheEventIds: ["n1_us_holiday", "n1_de_holiday"],
      teamId: testData.rrTeam?.id,
    });
    if (testData.collectiveTeam?.id) {
      await prisma.membership.deleteMany({ where: { teamId: testData.collectiveTeam.id } });
      await prisma.team.delete({ where: { id: testData.collectiveTeam.id } }).catch(() => {});
    }
  });

  function setupSpies() {
    findManyUserSettingsSpy = vi.spyOn(PrismaHolidayRepository.prototype, "findManyUserSettings");
    findUserSettingsSelectSpy = vi.spyOn(PrismaHolidayRepository.prototype, "findUserSettingsSelect");
    getHolidayDatesInRangeForCountriesSpy = vi.spyOn(
      HolidayService.prototype,
      "getHolidayDatesInRangeForCountries"
    );
    getHolidayDatesInRangeSpy = vi.spyOn(HolidayService.prototype, "getHolidayDatesInRange");
  }

  test("round-robin team: should use single batch query for holiday settings, not N per-user queries", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");
    setupSpies();

    await getSlots({
      eventTypeId: testData.rrEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    // Batch path: findManyUserSettings should be called exactly once for all 4 users
    expect(findManyUserSettingsSpy).toHaveBeenCalledTimes(1);
    // Per-user fallback path should NOT be used for team events
    expect(findUserSettingsSelectSpy).not.toHaveBeenCalled();
  });

  test("collective team: should use single batch query for holiday settings, not N per-user queries", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");
    setupSpies();

    await getSlots({
      eventTypeId: testData.collectiveEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    expect(findManyUserSettingsSpy).toHaveBeenCalledTimes(1);
    expect(findUserSettingsSelectSpy).not.toHaveBeenCalled();
  });

  test("team event: should fetch holiday dates once per unique country, not once per user", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");
    setupSpies();

    await getSlots({
      eventTypeId: testData.rrEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });

    // Batch country fetch should be called exactly once (not 4 times for 4 users)
    expect(getHolidayDatesInRangeForCountriesSpy).toHaveBeenCalledTimes(1);
    // The batch call should contain exactly 2 unique country codes (US, DE), not 4
    const callArgs = getHolidayDatesInRangeForCountriesSpy.mock.calls[0][0];
    expect(callArgs.countryCodes).toHaveLength(2);
    expect(callArgs.countryCodes).toEqual(expect.arrayContaining(["US", "DE"]));
    // Per-user getHolidayDatesInRange should NOT be called for team events
    expect(getHolidayDatesInRangeSpy).not.toHaveBeenCalled();
  });

  test("solo event via getSlots: should still use batch path (pre-fetched for all callers)", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");
    setupSpies();

    await getSlots({
      eventTypeId: testData.soloEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: false,
    });

    // getSlots always goes through calculateHostsAndAvailabilities which batch-fetches
    // holiday settings for ALL event types (solo included). The pre-fetched data is
    // passed via initialData, so the per-user fallback (findUserSettingsSelect) is never
    // reached. The per-user fallback only activates when getUserAvailability is called
    // directly without pre-populated data (e.g., API v1, getMemberAvailability).
    expect(findManyUserSettingsSpy).toHaveBeenCalledTimes(1);
    expect(findUserSettingsSelectSpy).not.toHaveBeenCalled();
    // Batch country fetch is used even for a single user
    expect(getHolidayDatesInRangeForCountriesSpy).toHaveBeenCalledTimes(1);
    expect(getHolidayDatesInRangeSpy).not.toHaveBeenCalled();
  });

  test("query count should remain constant regardless of team size", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    // First call: 4-member team (existing rrEventType)
    setupSpies();
    await getSlots({
      eventTypeId: testData.rrEventType.id,
      startTime: `${holidayDate}T00:00:00.000Z`,
      endTime: `${holidayDate}T23:59:59.999Z`,
      isTeamEvent: true,
    });
    const batchCallsWith4Users = findManyUserSettingsSpy.mock.calls.length;
    const countryCallsWith4Users = getHolidayDatesInRangeForCountriesSpy.mock.calls.length;
    findManyUserSettingsSpy.mockRestore();
    findUserSettingsSelectSpy.mockRestore();
    getHolidayDatesInRangeForCountriesSpy.mockRestore();
    getHolidayDatesInRangeSpy.mockRestore();

    // Create a smaller 2-member team for comparison
    const { team: smallTeam, eventType: smallTeamEventType } = await createTestTeamEvent(
      testData.users.slice(0, 2).map((u) => u.id),
      SchedulingType.ROUND_ROBIN
    );

    try {
      setupSpies();
      await getSlots({
        eventTypeId: smallTeamEventType.id,
        startTime: `${holidayDate}T00:00:00.000Z`,
        endTime: `${holidayDate}T23:59:59.999Z`,
        isTeamEvent: true,
      });
      const batchCallsWith2Users = findManyUserSettingsSpy.mock.calls.length;
      const countryCallsWith2Users = getHolidayDatesInRangeForCountriesSpy.mock.calls.length;

      // Core N+1 assertion: query count is the same for 2-member and 4-member teams
      expect(batchCallsWith2Users).toBe(batchCallsWith4Users);
      expect(countryCallsWith2Users).toBe(countryCallsWith4Users);
    } finally {
      await cleanupTestData({
        eventTypeIds: [smallTeamEventType.id],
        teamId: smallTeam.id,
      });
    }
  });
});
