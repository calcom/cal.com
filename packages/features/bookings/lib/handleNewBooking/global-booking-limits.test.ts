import {
  TestData,
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  getGoogleCalendarCredential,
  Timezones,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, vi } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

const eventLength = 30;

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

const otherTeamMembers = [
  {
    name: "Other Team Member 1",
    username: "other-team-member-1",
    timeZone: Timezones["+5:30"],
    // So, that it picks the first schedule from the list
    defaultScheduleId: null,
    email: "other-team-member-1@example.com",
    id: 102,
    // Has Evening shift
    schedules: [TestData.schedules.IstEveningShift],
    credentials: [getGoogleCalendarCredential()],
    selectedCalendars: [TestData.selectedCalendars.google],
    destinationCalendar: {
      integration: TestData.apps["google-calendar"].type,
      externalId: "other-team-member-1@google-calendar.com",
    },
  },
];

describe(
  "handleNewBooking",
  () => {
    setupAndTeardown();

    describe("Team Booking Limits", () => {
      // This test fails on CI as handleNewBooking throws no_available_users_found_error error
      // eslint-disable-next-line playwright/no-skipped-test
      test(`Booking limits per week
    `, async ({}) => {
        vi.setSystemTime(new Date("2024-09-02")); //Monday

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
                team: {
                  id: 1,
                  bookingLimits: { PER_WEEK: 2 },
                },
                schedulingType: SchedulingType.COLLECTIVE,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
                teamId: 1,
                schedulingType: SchedulingType.COLLECTIVE,
              },
            ],
            bookings: [
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-09-03T03:30:00.000Z`,
                endTime: `2024-09-03T04:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 102,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-09-03T04:00:00.000Z`,
                endTime: `2024-09-03T04:30:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 102,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-09-03T04:30:00.000Z`,
                endTime: `2024-09-03T05:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockBookingData1 = getMockRequestDataForBooking({
          data: {
            start: `2024-09-05T04:00:00.000Z`,
            end: `2024-09-05T04:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const { req: req1 } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData1,
        });

        const createdBooking = await handleNewBooking(req1);

        expect(createdBooking.responses).toContain({
          email: booker.email,
          name: booker.name,
        });

        const mockBookingData2 = getMockRequestDataForBooking({
          data: {
            start: `2024-09-06T04:00:00.000Z`,
            end: `2024-09-06T04:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const { req: req2 } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData2,
        });

        // this is the third team booking of this week for user 101, limit reached
        await expect(async () => await handleNewBooking(req2)).rejects.toThrowError(
          "no_available_users_found_error"
        );
      });

      test(`Booking limits per day`, async ({}) => {
        console.log("todo");
      });

      test(`Booking limits per month`, async ({}) => {
        console.log("todo");
      });

      test(`Booking limits per year`, async ({}) => {
        console.log("todo");
      });
    });
  },
  timeout
);
