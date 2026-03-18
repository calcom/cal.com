/**
 * Integration test: holiday blocking in the booking-creation path.
 *
 * ensureAvailableUsers → getUsersAvailability receives users WITHOUT pre-fetched
 * holidayData (IsFixedAwareUser doesn't carry it). The availability service must
 * fall back to an async DB lookup so holidays still block dates.
 *
 * Only external services (Redis, Google Calendar API) are stubbed.
 * All internal services, repos, and DB queries run against the real test database.
 */
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { prisma } from "@calcom/prisma";
import type { User, Schedule } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

const createTestUser = async (suffix: string) => {
  return prisma.user.create({
    data: {
      username: `hol-booking-${suffix}`,
      name: `Holiday Booking User ${suffix}`,
      email: `hol-booking-${suffix}@example.com`,
    },
  });
};

const createTestScheduleWithAvailability = async (userId: number) => {
  const schedule = await prisma.schedule.create({
    data: {
      name: `Holiday Booking Schedule ${Date.now()}`,
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

const loadUserForAvailability = async (userId: number) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      bufferTime: true,
      timeZone: true,
      timeFormat: true,
      defaultScheduleId: true,
      isPlatformManaged: true,
      availability: true,
      travelSchedules: true,
      schedules: {
        select: {
          id: true,
          timeZone: true,
          availability: {
            select: { days: true, startTime: true, endTime: true, date: true },
          },
        },
      },
    },
  });

  return {
    ...user,
    isFixed: false as const,
    groupId: null,
    credentials: [] as never[],
    allSelectedCalendars: [] as never[],
    userLevelSelectedCalendars: [] as never[],
  };
};

const cleanupTestData = async (data: {
  userIds?: number[];
  scheduleIds?: number[];
  holidayCacheEventIds?: string[];
}) => {
  if (data.holidayCacheEventIds?.length) {
    await prisma.holidayCache.deleteMany({ where: { eventId: { in: data.holidayCacheEventIds } } });
  }
  if (data.userIds?.length) {
    await prisma.userHolidaySettings.deleteMany({ where: { userId: { in: data.userIds } } });
  }
  if (data.scheduleIds?.length) {
    await prisma.availability.deleteMany({ where: { scheduleId: { in: data.scheduleIds } } });
    await prisma.schedule.deleteMany({ where: { id: { in: data.scheduleIds } } });
  }
  if (data.userIds?.length) {
    await prisma.user.deleteMany({ where: { id: { in: data.userIds } } });
  }
};

const holidayDate = "2026-07-01";
const nonHolidayDate = "2026-07-02";

describe("getUsersAvailability – holiday blocking without pre-fetched holidayData (integration)", () => {
  let testData: {
    users: User[];
    schedules: Schedule[];
  };

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "test-api-key");

    const users = await Promise.all([
      createTestUser(`us-${Date.now()}`),
      createTestUser(`none-${Date.now()}`),
    ]);

    const schedules = await Promise.all(users.map((u) => createTestScheduleWithAvailability(u.id)));

    await createTestHolidayCacheEntry({
      countryCode: "US",
      calendarId: "en.usa.official#holiday@group.v.calendar.google.com",
      eventId: "booking_test_us_holiday_1",
      name: "Test US Holiday",
      date: holidayDate,
      year: 2026,
    });

    await createTestHolidaySettings(users[0].id, "US");

    testData = { users, schedules };
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupTestData({
      userIds: testData.users?.map((u) => u.id),
      scheduleIds: testData.schedules?.map((s) => s.id),
      holidayCacheEventIds: ["booking_test_us_holiday_1"],
    });
  });

  test("holiday appears in datesOutOfOffice when holidayData is not pre-fetched on user", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const user = await loadUserForAvailability(testData.users[0].id);
    expect((user as Record<string, unknown>).holidayData).toBeUndefined();

    const service = getUserAvailabilityService();
    const [result] = await service.getUsersAvailability({
      users: [user],
      query: {
        dateFrom: `${holidayDate}T00:00:00Z`,
        dateTo: `${holidayDate}T23:59:59Z`,
        returnDateOverrides: false,
      },
      initialData: {},
    });

    expect(result.datesOutOfOffice[holidayDate]).toBeDefined();
    expect(result.datesOutOfOffice[holidayDate].reason).toBe("Test US Holiday");
    expect(result.datesOutOfOffice[holidayDate].fromUser).toBeNull();
  });

  test("holiday excludes date from oooExcludedDateRanges", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const user = await loadUserForAvailability(testData.users[0].id);

    const service = getUserAvailabilityService();
    const [result] = await service.getUsersAvailability({
      users: [user],
      query: {
        dateFrom: `${holidayDate}T00:00:00Z`,
        dateTo: `${holidayDate}T23:59:59Z`,
        returnDateOverrides: false,
      },
      initialData: {},
    });

    expect(result.oooExcludedDateRanges).toHaveLength(0);
  });

  test("non-holiday date has normal availability", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const user = await loadUserForAvailability(testData.users[0].id);

    const service = getUserAvailabilityService();
    const [result] = await service.getUsersAvailability({
      users: [user],
      query: {
        dateFrom: `${nonHolidayDate}T00:00:00Z`,
        dateTo: `${nonHolidayDate}T23:59:59Z`,
        returnDateOverrides: false,
      },
      initialData: {},
    });

    expect(result.oooExcludedDateRanges.length).toBeGreaterThan(0);
    expect(result.datesOutOfOffice[nonHolidayDate]).toBeUndefined();
  });

  test("user without holiday settings has normal availability on holiday date", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const user = await loadUserForAvailability(testData.users[1].id);

    const service = getUserAvailabilityService();
    const [result] = await service.getUsersAvailability({
      users: [user],
      query: {
        dateFrom: `${holidayDate}T00:00:00Z`,
        dateTo: `${holidayDate}T23:59:59Z`,
        returnDateOverrides: false,
      },
      initialData: {},
    });

    expect(result.oooExcludedDateRanges.length).toBeGreaterThan(0);
    expect(result.datesOutOfOffice[holidayDate]).toBeUndefined();
  });

  test("multi-user: only holiday-configured user has blocked date", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    const [user1, user2] = await Promise.all(
      testData.users.map((u) => loadUserForAvailability(u.id))
    );

    const service = getUserAvailabilityService();
    const results = await service.getUsersAvailability({
      users: [user1, user2],
      query: {
        dateFrom: `${holidayDate}T00:00:00Z`,
        dateTo: `${holidayDate}T23:59:59Z`,
        returnDateOverrides: false,
      },
      initialData: {},
    });

    expect(results[0].datesOutOfOffice[holidayDate]).toBeDefined();
    expect(results[0].oooExcludedDateRanges).toHaveLength(0);

    expect(results[1].datesOutOfOffice[holidayDate]).toBeUndefined();
    expect(results[1].oooExcludedDateRanges.length).toBeGreaterThan(0);
  });

  test("disabled holiday does not block the date", async () => {
    vi.setSystemTime("2026-06-25T00:00:00Z");

    await prisma.userHolidaySettings.update({
      where: { userId: testData.users[0].id },
      data: { disabledIds: ["booking_test_us_holiday_1"] },
    });

    try {
      const user = await loadUserForAvailability(testData.users[0].id);

      const service = getUserAvailabilityService();
      const [result] = await service.getUsersAvailability({
        users: [user],
        query: {
          dateFrom: `${holidayDate}T00:00:00Z`,
          dateTo: `${holidayDate}T23:59:59Z`,
          returnDateOverrides: false,
        },
        initialData: {},
      });

      expect(result.datesOutOfOffice[holidayDate]).toBeUndefined();
      expect(result.oooExcludedDateRanges.length).toBeGreaterThan(0);
    } finally {
      await prisma.userHolidaySettings.update({
        where: { userId: testData.users[0].id },
        data: { disabledIds: [] },
      });
    }
  });
});
