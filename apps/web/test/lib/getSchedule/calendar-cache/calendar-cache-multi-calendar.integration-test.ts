import { prisma } from "@calcom/prisma";
import type { Credential, EventType, Schedule, User } from "@calcom/prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, test, vi } from "vitest";
import { expect } from "../expects";
import type { UserCalendarSetup } from "./utils";
import {
  CALENDAR_CACHE_FEATURE,
  cleanupUserCalendarSetup,
  createCredential,
  createGoogleCalendarApp,
  createScheduleWithAvailability,
  createSelectedCalendarWithoutSync,
  createSelectedCalendarWithSync,
  createSoloEventType,
  createTestUser,
  createUserWithCalendarSetup,
  enableFeatureForUser,
  FAKED_NOW,
  getSlotsForDate,
  seedCalendarCacheEvent,
  testDate,
  WEEKDAY_HOURLY_SLOTS,
} from "./utils";

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
