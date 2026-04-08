import { mockCalendar } from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { Schedule, User } from "@calcom/prisma/client";
import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";
import { expect, expectedSlotsForSchedule } from "./expects";

describe("getSchedule calendarEvents (integration)", () => {
  let user: User;
  let userSchedule: Schedule;
  const timestamp = Date.now();

  const createdEventTypeIds: number[] = [];

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    user = await prisma.user.create({
      data: {
        username: `cal-events-user-${timestamp}`,
        name: "Calendar Events Test User",
        email: `cal-events-user-${timestamp}@example.com`,
        timeZone: "Asia/Kolkata",
      },
    });

    // IST Work Hours schedule (09:30-18:00 IST = 04:00-12:30 UTC, all days)
    userSchedule = await prisma.schedule.create({
      data: {
        name: `CalEvents Schedule ${timestamp}`,
        userId: user.id,
        timeZone: "Asia/Kolkata",
      },
    });

    await prisma.availability.create({
      data: {
        scheduleId: userSchedule.id,
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T09:30:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultScheduleId: userSchedule.id },
    });

    // Ensure google-calendar app exists
    await prisma.app.upsert({
      where: { slug: "google-calendar" },
      update: { enabled: true },
      create: {
        slug: "google-calendar",
        dirName: "googlecalendar",
        categories: ["calendar"],
        enabled: true,
      },
    });

    // Create a Google Calendar credential for the user
    await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: { access_token: "MOCK_ACCESS_TOKEN", refresh_token: "MOCK_REFRESH_TOKEN" },
        userId: user.id,
        appId: "google-calendar",
      },
    });

    // Create a user-level selected calendar
    await prisma.selectedCalendar.create({
      data: {
        userId: user.id,
        integration: "google_calendar",
        externalId: `user-calendar-${timestamp}@example.com`,
      },
    });
  });

  afterEach(async () => {
    vi.useRealTimers();

    // Clean up per-test event types and their selected calendars
    if (createdEventTypeIds.length > 0) {
      await prisma.selectedCalendar.deleteMany({
        where: { eventTypeId: { in: createdEventTypeIds } },
      });
      await prisma.eventType.deleteMany({ where: { id: { in: createdEventTypeIds } } });
      createdEventTypeIds.length = 0;
    }
  });

  afterAll(async () => {
    // Cleanup in reverse FK dependency order
    await prisma.selectedCalendar.deleteMany({ where: { userId: user?.id } });
    await prisma.credential.deleteMany({ where: { userId: user?.id } });
    await prisma.eventType.deleteMany({ where: { userId: user?.id } });
    await prisma.availability.deleteMany({ where: { scheduleId: userSchedule?.id } });
    if (userSchedule?.id) await prisma.schedule.delete({ where: { id: userSchedule.id } });
    if (user?.id) await prisma.user.delete({ where: { id: user.id } });
  });

  async function createTestEventType(
    overrides: { slotInterval?: number; length?: number; useEventLevelSelectedCalendars?: boolean } = {}
  ): Promise<{ id: number; slug: string }> {
    const slug = `cal-evt-${timestamp}-${createdEventTypeIds.length}`;
    const et = await prisma.eventType.create({
      data: {
        title: `CalEvent ${slug}`,
        slug,
        length: overrides.length ?? 45,
        slotInterval: overrides.slotInterval ?? 45,
        useEventLevelSelectedCalendars: overrides.useEventLevelSelectedCalendars ?? false,
        userId: user.id,
        users: { connect: [{ id: user.id }] },
      },
    });
    createdEventTypeIds.push(et.id);
    return et;
  }

  function getSlots(
    eventTypeId: number,
    startTime: string,
    endTime: string
  ): ReturnType<ReturnType<typeof getAvailableSlotsService>["getAvailableSlots"]> {
    const availableSlotsService = getAvailableSlotsService();
    return availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId,
        eventTypeSlug: "",
        startTime,
        endTime,
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        orgSlug: null,
      },
    });
  }

  test("correctly identifies unavailable slots from selected calendars at user level", async () => {
    const plus1DateString = "2026-06-15";
    const plus2DateString = "2026-06-16";
    vi.setSystemTime(`${plus1DateString}T01:00:00Z`);

    mockCalendar("googlecalendar", {
      create: {
        uid: "MOCK_ID",
        iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
      },
      busySlots: [
        {
          start: `${plus2DateString}T04:45:00.000Z`,
          end: `${plus2DateString}T23:00:00.000Z`,
        },
      ],
    });

    const et = await createTestEventType({ useEventLevelSelectedCalendars: false });

    const schedule = await getSlots(
      et.id,
      `${plus1DateString}T18:30:00.000Z`,
      `${plus2DateString}T18:29:59.999Z`
    );

    // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
    expect(schedule).toHaveTimeSlots([`04:00:00.000Z`], {
      dateString: plus2DateString,
    });
  });

  describe("useEventLevelSelectedCalendars is true", () => {
    test("correctly identifies unavailable slots from selected calendars at event level", async () => {
      const plus1DateString = "2026-06-15";
      const plus2DateString = "2026-06-16";
      vi.setSystemTime(`${plus1DateString}T01:00:00Z`);

      mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [
          {
            start: `${plus2DateString}T04:45:00.000Z`,
            end: `${plus2DateString}T23:00:00.000Z`,
          },
        ],
      });

      const et = await createTestEventType({
        useEventLevelSelectedCalendars: true,
      });

      // Create event-level selected calendar
      await prisma.selectedCalendar.create({
        data: {
          userId: user.id,
          integration: "google_calendar",
          externalId: `event-calendar-${timestamp}@example.com`,
          eventTypeId: et.id,
        },
      });

      const schedule = await getSlots(
        et.id,
        `${plus1DateString}T18:30:00.000Z`,
        `${plus2DateString}T18:29:59.999Z`
      );

      // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
      expect(schedule).toHaveTimeSlots([`04:00:00.000Z`], {
        dateString: plus2DateString,
      });
    });

    test("doesn't consider user level selected calendars", async () => {
      const plus1DateString = "2026-06-15";
      const plus2DateString = "2026-06-16";
      vi.setSystemTime(`${plus1DateString}T01:00:00Z`);

      mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [
          {
            start: `${plus2DateString}T04:45:00.000Z`,
            end: `${plus2DateString}T23:00:00.000Z`,
          },
        ],
      });

      const et = await createTestEventType({
        useEventLevelSelectedCalendars: true,
        slotInterval: 60,
        length: 60,
      });

      // User-level selected calendar exists (from beforeAll), but NO event-level calendar
      // so the calendar should NOT be checked -> all slots available

      const schedule = await getSlots(
        et.id,
        `${plus1DateString}T18:30:00.000Z`,
        `${plus2DateString}T18:29:59.999Z`
      );

      expect(schedule).toHaveTimeSlots(
        expectedSlotsForSchedule.IstWorkHours.interval["1hr"].allPossibleSlotsStartingAt430,
        {
          dateString: plus2DateString,
        }
      );
    });

    test("doesnt consider another event type's selected calendars", async () => {
      const plus1DateString = "2026-06-15";
      const plus2DateString = "2026-06-16";
      vi.setSystemTime(`${plus1DateString}T01:00:00Z`);

      mockCalendar("googlecalendar", {
        create: {
          uid: "MOCK_ID",
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
        },
        busySlots: [
          {
            start: `${plus2DateString}T04:45:00.000Z`,
            end: `${plus2DateString}T23:00:00.000Z`,
          },
        ],
      });

      const et = await createTestEventType({
        useEventLevelSelectedCalendars: true,
        slotInterval: 60,
        length: 60,
      });

      // Create another event type and attach the selected calendar to THAT one
      const anotherEt = await createTestEventType({
        useEventLevelSelectedCalendars: true,
        slotInterval: 60,
        length: 60,
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: user.id,
          integration: "google_calendar",
          externalId: `another-event-calendar-${timestamp}@example.com`,
          eventTypeId: anotherEt.id,
        },
      });

      const schedule = await getSlots(
        et.id,
        `${plus1DateString}T18:30:00.000Z`,
        `${plus2DateString}T18:29:59.999Z`
      );

      // Since the selected calendar is on a different event type, all slots should be available
      expect(schedule).toHaveTimeSlots(
        expectedSlotsForSchedule.IstWorkHours.interval["1hr"].allPossibleSlotsStartingAt430,
        {
          dateString: plus2DateString,
        }
      );
    });
  });
});
