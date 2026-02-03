import {
  TestData,
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  getGoogleCalendarCredential,
  Timezones,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
// TODO: we should rename this - it doesnt get a mockRequestDataForBooking - it just gets mock booking data.
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { describe, expect, vi, beforeAll } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { getNewBookingHandler } from "./test/getNewBookingHandler";

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

const eventLength = 30;

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
    beforeAll(async () => {
      vi.setSystemTime(new Date("2024-08-05")); //Monday
    });

    describe("Team Booking Limits", () => {
      // This test fails on CI as handleNewBooking throws no_available_users_found_error error
      // eslint-disable-next-line playwright/no-skipped-test
      test(`Booking limits per week
    `, async ({}) => {
        const handleNewBooking = getNewBookingHandler();
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
                  includeManagedEventsInLimits: false,
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
              {
                id: 3,
                slotInterval: eventLength,
                length: eventLength,
                hosts: [
                  {
                    userId: 101,
                  },
                ],
                teamId: 1,
                schedulingType: SchedulingType.MANAGED,
              },
              {
                id: 4,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                parent: {
                  id: 3,
                },
              },
            ],
            bookings: [
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T03:30:00.000Z`,
                endTime: `2024-08-06T04:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 102,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T04:00:00.000Z`,
                endTime: `2024-08-06T04:30:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 102,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T04:30:00.000Z`,
                endTime: `2024-08-06T05:00:00.000Z`,
              },
              {
                // managed event type doesn't count, includeManagedEventsInLimits is false
                eventTypeId: 4,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-07T04:30:00.000Z`,
                endTime: `2024-08-07T05:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockBookingWithinLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-08-08T04:00:00.000Z`,
            end: `2024-08-08T04:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingWithinLimit,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingAboveLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-08-08T04:00:00.000Z`,
            end: `2024-08-08T04:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        // this is the third team booking of this week for user 101, limit reached
        await expect(
          async () =>
            await handleNewBooking({
              bookingData: mockBookingAboveLimit,
            })
        ).rejects.toThrowError("no_available_users_found_error");
      });

      test(`Booking limits per day`, async ({}) => {
        const handleNewBooking = getNewBookingHandler();
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
                  bookingLimits: { PER_DAY: 1 },
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
            bookings: [],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockBookingWithinLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-08-07T04:30:00.000Z`,
            end: `2024-08-07T05:00:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingWithinLimit,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingAboveLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-08-07T04:00:00.000Z`,
            end: `2024-08-07T04:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        // this is the second team booking of this day for user 101, limit reached
        await expect(
          async () =>
            await handleNewBooking({
              bookingData: mockBookingAboveLimit,
            })
        ).rejects.toThrowError("no_available_users_found_error");
      });

      test(`Booking limits per month`, async ({}) => {
        const handleNewBooking = getNewBookingHandler();
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
                  bookingLimits: { PER_MONTH: 4 },
                  includeManagedEventsInLimits: true,
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
              {
                id: 3,
                slotInterval: eventLength,
                length: eventLength,
                hosts: [
                  {
                    userId: 101,
                  },
                ],
                teamId: 1,
                schedulingType: SchedulingType.MANAGED,
              },
              {
                id: 4,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                parent: {
                  id: 3,
                },
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-03T03:30:00.000Z`,
                endTime: `2024-08-03T04:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-22T03:30:00.000Z`,
                endTime: `2024-08-22T04:00:00.000Z`,
              },
              {
                //managed event type also counts towards limits
                eventTypeId: 4,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-15T03:30:00.000Z`,
                endTime: `2024-08-15T04:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockBookingWithinLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-08-29T04:30:00.000Z`,
            end: `2024-08-29T05:00:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingWithinLimit,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingAboveLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-08-25T04:00:00.000Z`,
            end: `2024-08-25T04:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        // this is the firth team booking (incl. managed) of this month for user 101, limit reached
        await expect(
          async () =>
            await handleNewBooking({
              bookingData: mockBookingAboveLimit,
            })
        ).rejects.toThrowError("no_available_users_found_error");
      });

      test(`Booking limits per year`, async ({}) => {
        const handleNewBooking = getNewBookingHandler();
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
                  bookingLimits: { PER_YEAR: 3 },
                  includeManagedEventsInLimits: true,
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
              {
                id: 3,
                slotInterval: eventLength,
                length: eventLength,
                hosts: [
                  {
                    userId: 101,
                  },
                ],
                teamId: 1,
                schedulingType: SchedulingType.MANAGED,
              },
              {
                id: 4,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                parent: {
                  id: 3,
                },
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-02-03T03:30:00.000Z`,
                endTime: `2024-02-03T04:00:00.000Z`,
              },
              {
                eventTypeId: 4,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-03T03:30:00.000Z`,
                endTime: `2024-08-03T04:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockBookingWithinLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-08-29T04:30:00.000Z`,
            end: `2024-08-29T05:00:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingWithinLimit,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingAboveLimit = getMockRequestDataForBooking({
          data: {
            start: `2024-11-25T04:00:00.000Z`,
            end: `2024-11-25T04:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(
          async () =>
            await handleNewBooking({
              bookingData: mockBookingAboveLimit,
            })
        ).rejects.toThrowError("no_available_users_found_error");
      });
    });
  },
  timeout
);
