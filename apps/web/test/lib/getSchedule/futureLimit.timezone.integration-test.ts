import { afterAll, afterEach, beforeAll, describe, test, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { prisma } from "@calcom/prisma";
import type { EventType, Schedule, User } from "@calcom/prisma/client";
import { BookingStatus, PeriodType } from "@calcom/prisma/enums";

import { expect, expectedSlotsForSchedule } from "./expects";

function getPeriodTypeData({
  type,
  periodDays,
  periodCountCalendarDays,
  periodStartDate,
  periodEndDate,
}: {
  type: PeriodType;
  periodDays?: number;
  periodCountCalendarDays?: boolean;
  periodStartDate?: Date;
  periodEndDate?: Date;
}) {
  if (type === PeriodType.ROLLING) {
    return { periodType: PeriodType.ROLLING, periodDays, periodCountCalendarDays };
  }
  if (type === PeriodType.ROLLING_WINDOW) {
    return { periodType: PeriodType.ROLLING_WINDOW, periodDays, periodCountCalendarDays };
  }
  if (type === PeriodType.RANGE) {
    return { periodType: PeriodType.RANGE, periodStartDate, periodEndDate };
  }
  return {};
}

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
  ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK: 61,
  SINGLE_ORG_SLUG: "",
  APP_CREDENTIAL_SHARING_ENABLED: false,
  CREDENTIAL_SYNC_ENDPOINT: undefined,
  CREDENTIAL_SYNC_SECRET: undefined,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME: "calcom-credential-sync-secret",
  ENABLE_ASYNC_TASKER: false,
}));

describe("getSchedule futureLimit timezone (integration)", () => {
  let user: User;
  let userSchedule: Schedule;
  let noWeekendsSchedule: Schedule;
  const timestamp = Date.now();
  const createdEventTypeIds: number[] = [];
  const createdBookingIds: number[] = [];

  beforeAll(async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", undefined);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", undefined);

    user = await prisma.user.create({
      data: {
        username: `fl-tz-user-${timestamp}`,
        name: "FutureLimit TZ User",
        email: `fl-tz-user-${timestamp}@example.com`,
        timeZone: "Asia/Kolkata",
      },
    });

    // IST Work Hours: 9:30AM - 6PM IST, all days
    userSchedule = await prisma.schedule.create({
      data: {
        name: `IST Work Hours ${timestamp}`,
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

    // IST Work Hours No Weekends: weekdays only
    noWeekendsSchedule = await prisma.schedule.create({
      data: {
        name: `IST No Weekends ${timestamp}`,
        userId: user.id,
        timeZone: "Asia/Kolkata",
      },
    });

    await prisma.availability.create({
      data: {
        scheduleId: noWeekendsSchedule.id,
        days: [1, 2, 3, 4, 5],
        startTime: new Date("1970-01-01T09:30:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
      },
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    // Clean up bookings and event types created during the test
    if (createdBookingIds.length > 0) {
      await prisma.attendee.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      createdBookingIds.length = 0;
    }
    if (createdEventTypeIds.length > 0) {
      await prisma.eventType.deleteMany({ where: { id: { in: createdEventTypeIds } } });
      createdEventTypeIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { userId: user?.id } });
    await prisma.eventType.deleteMany({ where: { userId: user?.id } });
    await prisma.availability.deleteMany({
      where: { scheduleId: { in: [userSchedule?.id, noWeekendsSchedule?.id].filter(Boolean) } },
    });
    await prisma.schedule.deleteMany({
      where: { id: { in: [userSchedule?.id, noWeekendsSchedule?.id].filter(Boolean) } },
    });
    if (user?.id) await prisma.user.delete({ where: { id: user.id } });
  });

  async function createEventType(periodData: Record<string, unknown>, scheduleId?: number) {
    const slug = `fl-evt-${timestamp}-${createdEventTypeIds.length}`;
    const et = await prisma.eventType.create({
      data: {
        title: `FutureLimit Event ${slug}`,
        slug,
        length: 60,
        userId: user.id,
        users: { connect: [{ id: user.id }] },
        ...periodData,
      },
    });
    createdEventTypeIds.push(et.id);

    // If a non-default schedule is specified, update user's default
    if (scheduleId) {
      await prisma.user.update({ where: { id: user.id }, data: { defaultScheduleId: scheduleId } });
    }

    return et;
  }

  async function createBooking(eventTypeId: number, startTime: string, endTime: string) {
    const booking = await prisma.booking.create({
      data: {
        uid: `fl-booking-${timestamp}-${createdBookingIds.length}`,
        title: "FutureLimit Test Booking",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        userId: user.id,
        eventTypeId,
        status: BookingStatus.ACCEPTED,
      },
    });
    createdBookingIds.push(booking.id);
    return booking;
  }

  function getSlots(eventTypeId: number, startTime: string, endTime: string, timeZone: string) {
    const availableSlotsService = getAvailableSlotsService();
    return availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId,
        eventTypeSlug: "",
        usernameList: [],
        startTime,
        endTime,
        timeZone,
        isTeamEvent: false,
        orgSlug: null,
      },
    });
  }

  describe("Future Limits", () => {
    describe("PeriodType=ROLLING", () => {
      test("When the time of the first slot of current day hasn't reached", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING, periodDays: 2, periodCountCalendarDays: true })
        );

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-05-31", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-02", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
      });

      test("When the time of the last slot of current day has passed", async () => {
        vi.setSystemTime("2024-05-31T11:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING, periodDays: 2, periodCountCalendarDays: true })
        );

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-05-31" });
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-02", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
      });

      test("When the first timeslot of current day has passed", async () => {
        vi.setSystemTime("2024-05-31T04:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING, periodDays: 2, periodCountCalendarDays: true })
        );

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        // At 04:30 UTC (10:00 IST), slots at 04:30 and 05:30 are past/too close
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430.slice(2),
          { doExactMatch: true, dateString: "2024-05-31" }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-02", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
      });

      test("Counting only business days (periodCountCalendarDays=false)", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING, periodDays: 2, periodCountCalendarDays: false })
        );

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        // Friday (today)
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-05-31", doExactMatch: true }
        );
        // Saturday - available but not counted
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        // Sunday - available but not counted
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-02", doExactMatch: true }
        );
        // Monday - Day1 of periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-03", doExactMatch: true }
        );
        // Tuesday - Day2 of periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-04", doExactMatch: true }
        );
        // Wednesday - beyond
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-05" });
      });

      describe("Borderline cases", () => {
        test("When it is the very first second of the day", async () => {
          vi.setSystemTime("2024-05-30T18:30:00Z");
          const et = await createEventType(
            getPeriodTypeData({ type: PeriodType.ROLLING, periodDays: 2, periodCountCalendarDays: true })
          );

          const scheduleForEvent = await getSlots(
            et.id,
            "2024-05-30T18:30:00.000Z",
            "2024-06-05T18:29:59.999Z",
            "Asia/Kolkata"
          );

          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-05-31", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-01", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-02", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
        });

        test("When it is the very last second of the day", async () => {
          vi.setSystemTime("2024-05-31T18:29:00Z");
          const et = await createEventType(
            getPeriodTypeData({ type: PeriodType.ROLLING, periodDays: 2, periodCountCalendarDays: true })
          );

          const scheduleForEvent = await getSlots(
            et.id,
            "2024-05-30T18:30:00.000Z",
            "2024-06-05T18:29:59.999Z",
            "Asia/Kolkata"
          );

          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-05-31" });
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-01", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-02", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
        });

        describe("GMT-11 Browsing", () => {
          test("When the time of the first slot of current day hasn't reached", async () => {
            vi.setSystemTime("2024-05-31T01:30:00Z");
            const et = await createEventType(
              getPeriodTypeData({ type: PeriodType.ROLLING, periodDays: 2, periodCountCalendarDays: true })
            );

            const scheduleForEvent = await getSlots(
              et.id,
              "2024-05-30T18:30:00.000Z",
              "2024-06-05T18:29:59.999Z",
              "Pacific/Pago_Pago"
            );

            const allTimeSlotsForToday = [
              "2024-05-31T11:00:00.000Z",
              "2024-06-01T04:00:00.000Z",
              "2024-06-01T05:00:00.000Z",
              "2024-06-01T06:00:00.000Z",
              "2024-06-01T07:00:00.000Z",
              "2024-06-01T08:00:00.000Z",
              "2024-06-01T09:00:00.000Z",
              "2024-06-01T10:00:00.000Z",
            ];

            expect(scheduleForEvent).toHaveTimeSlots(
              [
                "2024-05-31T04:00:00.000Z",
                "2024-05-31T05:00:00.000Z",
                "2024-05-31T06:00:00.000Z",
                "2024-05-31T07:00:00.000Z",
                "2024-05-31T08:00:00.000Z",
                "2024-05-31T09:00:00.000Z",
                "2024-05-31T10:00:00.000Z",
              ],
              { dateString: "2024-05-30", doExactMatch: true }
            );

            expect(scheduleForEvent).toHaveTimeSlots(allTimeSlotsForToday, {
              dateString: "2024-05-31",
              doExactMatch: true,
            });

            const replacedSlots = [
              "2024-06-01T11:00:00.000Z",
              "2024-06-02T04:00:00.000Z",
              "2024-06-02T05:00:00.000Z",
              "2024-06-02T06:00:00.000Z",
              "2024-06-02T07:00:00.000Z",
              "2024-06-02T08:00:00.000Z",
              "2024-06-02T09:00:00.000Z",
              "2024-06-02T10:00:00.000Z",
            ];

            expect(scheduleForEvent).toHaveTimeSlots(replacedSlots, {
              dateString: "2024-06-01",
              doExactMatch: true,
            });

            expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-02" });
            expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
          });
        });
      });
    });

    describe("PeriodType=ROLLING_WINDOW", () => {
      test("Day fully booked in between - makes periodDays available", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING_WINDOW, periodDays: 3, periodCountCalendarDays: true })
        );
        await createBooking(et.id, "2024-06-01T18:30:00.000Z", "2024-06-02T18:30:00.000Z");

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-05-31", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-02" });
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-03", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
      });

      test("Last slot passed + day fully booked in between", async () => {
        vi.setSystemTime("2024-05-31T11:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING_WINDOW, periodDays: 3, periodCountCalendarDays: true })
        );
        await createBooking(et.id, "2024-06-01T18:30:00.000Z", "2024-06-02T18:30:00.000Z");

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-05-31" });
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-02" });
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-03", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-04", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-05" });
      });

      test("First timeslot passed + day fully booked in between", async () => {
        vi.setSystemTime("2024-05-31T04:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING_WINDOW, periodDays: 3, periodCountCalendarDays: true })
        );
        await createBooking(et.id, "2024-06-01T18:30:00.000Z", "2024-06-02T18:30:00.000Z");

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        // At 04:30 UTC (10:00 IST), slots at 04:30 and 05:30 are past/too close
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430.slice(2),
          { dateString: "2024-05-31", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-02" });
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-03", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-05" });
      });

      test("Business days only (periodCountCalendarDays=false) with booked day", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING_WINDOW, periodDays: 3, periodCountCalendarDays: false })
        );
        // Fully book Monday (plus3)
        await createBooking(et.id, "2024-06-02T18:30:00.000Z", "2024-06-03T18:30:00.000Z");

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        // Day1: Friday (today)
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-05-31", doExactMatch: true }
        );
        // Saturday - available but not counted
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        // Sunday - available but not counted
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-02", doExactMatch: true }
        );
        // Monday - fully booked
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
        // Day2: Tuesday
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-04", doExactMatch: true }
        );
        // Day3: Wednesday
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-05", doExactMatch: true }
        );
      });

      describe("Borderline cases", () => {
        test("When it is the very first second of the day", async () => {
          vi.setSystemTime("2024-05-30T18:30:00Z");
          const et = await createEventType(
            getPeriodTypeData({
              type: PeriodType.ROLLING_WINDOW,
              periodDays: 3,
              periodCountCalendarDays: true,
            })
          );
          await createBooking(et.id, "2024-06-01T18:30:00.000Z", "2024-06-02T18:30:00.000Z");

          const scheduleForEvent = await getSlots(
            et.id,
            "2024-05-30T18:30:00.000Z",
            "2024-06-05T18:29:59.999Z",
            "Asia/Kolkata"
          );

          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-05-31", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-01", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-02" });
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-03", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
        });

        test("When it is the very last second of the day", async () => {
          vi.setSystemTime("2024-05-31T18:29:00Z");
          const et = await createEventType(
            getPeriodTypeData({
              type: PeriodType.ROLLING_WINDOW,
              periodDays: 3,
              periodCountCalendarDays: true,
            })
          );
          await createBooking(et.id, "2024-06-01T18:30:00.000Z", "2024-06-02T18:30:00.000Z");

          const scheduleForEvent = await getSlots(
            et.id,
            "2024-05-30T18:30:00.000Z",
            "2024-06-05T18:29:59.999Z",
            "Asia/Kolkata"
          );

          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-05-31" });
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-01", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-02" });
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-03", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-04", doExactMatch: true }
          );
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-05" });
        });
      });

      test("Weekend not available + booked day on weekend boundary", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");

        // Switch to no-weekends schedule
        await prisma.user.update({ where: { id: user.id }, data: { defaultScheduleId: noWeekendsSchedule.id } });

        const et = await createEventType(
          getPeriodTypeData({ type: PeriodType.ROLLING_WINDOW, periodDays: 3, periodCountCalendarDays: true })
        );
        // Fully book Monday (plus3)
        await createBooking(et.id, "2024-06-02T18:30:00.000Z", "2024-06-03T18:30:00.000Z");

        try {
          const scheduleForEvent = await getSlots(
            et.id,
            "2024-05-30T18:30:00.000Z",
            "2024-06-05T18:29:59.999Z",
            "Asia/Kolkata"
          );

          // Friday (today)
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-05-31", doExactMatch: true }
          );
          // Saturday - no weekends
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-01" });
          // Sunday - no weekends
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-02" });
          // Monday - fully booked
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
          // Tuesday
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-04", doExactMatch: true }
          );
          // Wednesday
          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            { dateString: "2024-06-05", doExactMatch: true }
          );
        } finally {
          // Restore default schedule
          await prisma.user.update({ where: { id: user.id }, data: { defaultScheduleId: userSchedule.id } });
        }
      });
    });

    describe("PeriodType=RANGE", () => {
      test("Basic test", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const et = await createEventType(
          getPeriodTypeData({
            type: PeriodType.RANGE,
            periodStartDate: new Date("2024-06-01T00:00:00.000Z"),
            periodEndDate: new Date("2024-06-02T00:00:00.000Z"),
            periodCountCalendarDays: true,
          })
        );

        const scheduleForEvent = await getSlots(
          et.id,
          "2024-05-30T18:30:00.000Z",
          "2024-06-05T18:29:59.999Z",
          "Asia/Kolkata"
        );

        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-05-31" });
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-01", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          { dateString: "2024-06-02", doExactMatch: true }
        );
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-03" });
        expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-06-04" });
      });

      describe("GMT-11 Browsing", () => {
        test("should show correct timeslots only for 24th and 25th July (of IST Timezone)", async () => {
          vi.setSystemTime("2024-07-05T01:30:00Z");
          const et = await createEventType(
            getPeriodTypeData({
              type: PeriodType.RANGE,
              periodStartDate: new Date("2024-07-25T00:00:00.000Z"),
              periodEndDate: new Date("2024-07-26T00:00:00.000Z"),
              periodCountCalendarDays: true,
            })
          );

          const scheduleForEvent = await getSlots(
            et.id,
            "2024-06-30T18:30:00.000Z",
            "2024-07-31T18:29:59.999Z",
            "Pacific/Pago_Pago"
          );

          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-07-21" });
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-07-22" });
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-07-23" });

          expect(scheduleForEvent).toHaveTimeSlots(
            [
              "2024-07-25T04:00:00.000Z",
              "2024-07-25T05:00:00.000Z",
              "2024-07-25T06:00:00.000Z",
              "2024-07-25T07:00:00.000Z",
              "2024-07-25T08:00:00.000Z",
              "2024-07-25T09:00:00.000Z",
              "2024-07-25T10:00:00.000Z",
            ],
            { dateString: "2024-07-24", doExactMatch: true }
          );

          expect(scheduleForEvent).toHaveTimeSlots(
            [
              "2024-07-25T11:00:00.000Z",
              "2024-07-26T04:00:00.000Z",
              "2024-07-26T05:00:00.000Z",
              "2024-07-26T06:00:00.000Z",
              "2024-07-26T07:00:00.000Z",
              "2024-07-26T08:00:00.000Z",
              "2024-07-26T09:00:00.000Z",
              "2024-07-26T10:00:00.000Z",
            ],
            { dateString: "2024-07-25", doExactMatch: true }
          );

          expect(scheduleForEvent).toHaveTimeSlots(["2024-07-26T11:00:00.000Z"], {
            dateString: "2024-07-26",
            doExactMatch: true,
          });

          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-07-27" });
          expect(scheduleForEvent).toHaveDateDisabled({ dateString: "2024-07-28" });
        });
      });
    });
  });
});
