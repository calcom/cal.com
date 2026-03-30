import { prisma } from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, test, vi } from "vitest";
import { expect } from "../expects";
import type { UserCalendarSetup } from "./utils";
import {
  CALENDAR_CACHE_FEATURE,
  cleanupUserCalendarSetup,
  createGoogleCalendarApp,
  createSoloEventType,
  createUserWithCalendarSetup,
  FAKED_NOW,
  FRESH_SYNC_DATE,
  farFutureDate,
  getSlotsForDate,
  STALE_SYNC_DATE,
  seedCalendarCacheEvent,
  testDate,
  WEEKDAY_HOURLY_SLOTS,
} from "./utils";

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
