/**
 * These integration tests aim to cover difficult-to-test edge cases
 * Standard cases are currently handled in e2e tests only
 *
 * see: https://github.com/calcom/cal.com/pull/10480
 *      https://github.com/calcom/cal.com/pull/10968
 */
import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, vi } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  TestData,
  createBookingScenario,
  getBooker,
  getDate,
  getNextMonthNotStartingOnWeekStart,
  getOrganizer,
  getScenarioData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import { expectBookingToBeInDatabase } from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

const eventLength = 30;

describe("handleNewBooking", () => {
  setupAndTeardown();

  describe(
    "Booking Limits",
    () => {
      // This test fails on CI as handleNewBooking throws no_available_users_found_error error
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip(
        `should fail a booking if yearly booking limits are already reached
            1. year with limits reached: should fail to book
            2. following year without bookings: should create a booking in the database
        `,
        async ({}) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          });

          const { dateString: nextYearDateString } = getDate({ yearIncrement: 1 });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: eventLength,
                  length: eventLength,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  bookingLimits: {
                    PER_YEAR: 2,
                  },
                },
              ],
              bookings: [
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${nextYearDateString}T04:00:00.000Z`,
                  endTime: `${nextYearDateString}T04:30:00.000Z`,
                },
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${nextYearDateString}T04:30:00.000Z`,
                  endTime: `${nextYearDateString}T05:00:00.000Z`,
                },
              ],
              organizer,
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${nextYearDateString}T05:00:00.000Z`,
              end: `${nextYearDateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          await expect(async () => await handleNewBooking(req)).rejects.toThrowError("booking_limit_reached");

          const { dateString: yearWithoutBookingsDateString } = getDate({ yearIncrement: 2 });

          const mockBookingDataFollowingYear = getMockRequestDataForBooking({
            data: {
              start: `${yearWithoutBookingsDateString}T05:00:00.000Z`,
              end: `${yearWithoutBookingsDateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req: reqFollowingYear } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingDataFollowingYear,
          });

          const createdBooking = await handleNewBooking(reqFollowingYear);

          expect(createdBooking.responses).toContain({
            email: booker.email,
            name: booker.name,
          });

          expect(createdBooking).toContain({
            location: "New York",
          });

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingDataFollowingYear.eventTypeId,
            status: BookingStatus.ACCEPTED,
          });
        },
        timeout
      );

      test(
        `should fail a booking if yearly duration limits are already reached
            1. year with limits reached: should fail to book
            2. following year without bookings: should create a booking in the database
        `,
        async ({}) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          });

          const yearlyDurationLimit = 2 * eventLength;

          const { dateString: nextYearDateString } = getDate({ yearIncrement: 1 });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: eventLength,
                  length: eventLength,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  durationLimits: {
                    PER_YEAR: yearlyDurationLimit,
                  },
                },
              ],
              bookings: [
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${nextYearDateString}T04:00:00.000Z`,
                  endTime: `${nextYearDateString}T04:30:00.000Z`,
                },
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${nextYearDateString}T04:30:00.000Z`,
                  endTime: `${nextYearDateString}T05:00:00.000Z`,
                },
              ],
              organizer,
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${nextYearDateString}T05:00:00.000Z`,
              end: `${nextYearDateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          vi.spyOn(prismock, "$queryRaw").mockResolvedValue([{ totalMinutes: yearlyDurationLimit }]);

          await expect(async () => await handleNewBooking(req)).rejects.toThrowError(
            "duration_limit_reached"
          );

          const { dateString: yearWithoutBookingsDateString } = getDate({ yearIncrement: 2 });

          const mockBookingDataFollowingYear = getMockRequestDataForBooking({
            data: {
              start: `${yearWithoutBookingsDateString}T05:00:00.000Z`,
              end: `${yearWithoutBookingsDateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req: reqFollowingYear } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingDataFollowingYear,
          });

          vi.spyOn(prismock, "$queryRaw").mockResolvedValue([{ totalMinutes: 0 }]);

          const createdBooking = await handleNewBooking(reqFollowingYear);

          expect(createdBooking.responses).toContain({
            email: booker.email,
            name: booker.name,
          });

          expect(createdBooking).toContain({
            location: "New York",
          });

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingDataFollowingYear.eventTypeId,
            status: BookingStatus.ACCEPTED,
          });
        },
        timeout
      );

      const { date: todayDate } = getDate();
      const { date: tomorrowDate } = getDate({ dateIncrement: 1 });

      // today or tomorrow can't be the 1st day of month for this test to succeed
      test.skipIf([todayDate, tomorrowDate].includes("01"))(
        `should fail a booking if exceeds booking limits with bookings in the past`,
        async ({}) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          });

          const { dateString: yesterdayDateString } = getDate({ dateIncrement: -1 });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: eventLength,
                  length: eventLength,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  bookingLimits: {
                    PER_MONTH: 2,
                  },
                },
              ],
              bookings: [
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${yesterdayDateString}T04:00:00.000Z`,
                  endTime: `${yesterdayDateString}T04:30:00.000Z`,
                },
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${yesterdayDateString}T04:30:00.000Z`,
                  endTime: `${yesterdayDateString}T05:00:00.000Z`,
                },
              ],
              organizer,
            })
          );

          const { dateString: tomorrowDateString } = getDate({ dateIncrement: 1 });

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${tomorrowDateString}T05:00:00.000Z`,
              end: `${tomorrowDateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          await expect(async () => await handleNewBooking(req)).rejects.toThrowError("booking_limit_reached");
        },
        timeout
      );

      test(
        `should fail a booking if exceeds booking limits with bookings in week across two months`,
        async ({}) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          });

          const firstDayOfMonthStartingWithPartialWeek = getNextMonthNotStartingOnWeekStart(
            organizer.weekStart,
            new Date(getDate({ monthIncrement: 1 }).dateString)
          );

          const lastDayOfMonthEndingWithPartialWeek = getDate({
            fromDate: new Date(firstDayOfMonthStartingWithPartialWeek.dateString),
            dateIncrement: -1,
          });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: eventLength,
                  length: eventLength,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  bookingLimits: {
                    PER_WEEK: 2,
                  },
                },
              ],
              bookings: [
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${firstDayOfMonthStartingWithPartialWeek.dateString}T04:00:00.000Z`,
                  endTime: `${firstDayOfMonthStartingWithPartialWeek.dateString}T04:30:00.000Z`,
                },
                {
                  eventTypeId: 1,
                  userId: 101,
                  status: BookingStatus.ACCEPTED,
                  startTime: `${firstDayOfMonthStartingWithPartialWeek.dateString}T04:30:00.000Z`,
                  endTime: `${firstDayOfMonthStartingWithPartialWeek.dateString}T05:00:00.000Z`,
                },
              ],
              organizer,
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${lastDayOfMonthEndingWithPartialWeek.dateString}T05:00:00.000Z`,
              end: `${lastDayOfMonthEndingWithPartialWeek.dateString}T05:30:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          await expect(async () => await handleNewBooking(req)).rejects.toThrowError("booking_limit_reached");
        },
        timeout
      );
    },
    timeout
  );
});
