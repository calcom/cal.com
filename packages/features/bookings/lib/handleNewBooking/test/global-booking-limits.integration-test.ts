import {
  TestData,
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  getGoogleCalendarCredential,
  Timezones,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
// TODO: we should rename this - it doesnt get a mockRequestDataForBooking - it just gets mock booking data.
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, expect, vi, beforeAll } from "vitest";

import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

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

const organizerWithBookingLimits = (bookingLimits: IntervalLimit) =>
  getOrganizer({
    name: "Organizer",
    email: "organizer@example.com",
    id: 101,
    schedules: [TestData.schedules.IstWorkHours],
    bookingLimits,
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

        // this is the fifth team booking (incl. managed) of this month for user 101, limit reached
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
    describe("Individual Booking Limits", () => {
      test(`Booking limits per day`, async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
            ],
            bookings: [],
            organizer: organizerWithBookingLimits({ PER_DAY: 1 }),
          })
        );

        const mockBookingData1 = getMockRequestDataForBooking({
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
          bookingData: mockBookingData1,
        });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingData2 = getMockRequestDataForBooking({
          data: {
            start: `2024-08-07T08:00:00.000Z`,
            end: `2024-08-07T08:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockBookingData2 })).rejects.toThrowError(
          "booking_limit_reached"
        );
      });
      test(`Booking limits per week`, async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
            ],
            bookings: [
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-07T04:30:00.000Z`,
                endTime: `2024-08-07T05:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_WEEK: 3 }),
          })
        );

        const mockBookingData1 = getMockRequestDataForBooking({
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

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData1 });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingData2 = getMockRequestDataForBooking({
          data: {
            start: `2024-08-09T04:00:00.000Z`,
            end: `2024-08-09T04:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockBookingData2 })).rejects.toThrowError(
          "booking_limit_reached"
        );
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
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
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
            ],
            organizer: organizerWithBookingLimits({ PER_MONTH: 3 }),
          })
        );

        const mockBookingData1 = getMockRequestDataForBooking({
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

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData1 });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingData2 = getMockRequestDataForBooking({
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

        await expect(handleNewBooking({ bookingData: mockBookingData2 })).rejects.toThrowError(
          "booking_limit_reached"
        );
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
                userId: 101,
                schedulingType: undefined,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                schedulingType: undefined,
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
            ],
            organizer: organizerWithBookingLimits({ PER_YEAR: 2 }),
          })
        );

        const mockBookingData1 = getMockRequestDataForBooking({
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

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData1 });

        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockBookingData2 = getMockRequestDataForBooking({
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

        await expect(handleNewBooking({ bookingData: mockBookingData2 })).rejects.toThrowError(
          "booking_limit_reached"
        );
      });
    });

    describe("Edge Cases and Priority Rules", () => {
      test("Event type limit is overridden by user global limit", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
                bookingLimits: { PER_DAY: 10 }, // High event type limit
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 1 }), // Stricter user limit
          })
        );

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockBookingData })).rejects.toThrowError(
          "booking_limit_reached"
        );
      });

      test("User global limits count bookings across all personal event types", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 1 }),
          })
        );

        const mockBooking = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockBooking })).rejects.toThrowError(
          "booking_limit_reached"
        );
      });

      test("Rescheduling doesn't count against user limit", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
            ],
            bookings: [
              {
                uid: "original-booking-uid",
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 1 }),
          })
        );

        const mockRescheduleData = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 1,
            rescheduleUid: "original-booking-uid",
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const rescheduledBooking = await handleNewBooking({ bookingData: mockRescheduleData });
        expect(rescheduledBooking).toBeDefined();
      });

      test("Multiple interval limits work together (PER_DAY + PER_WEEK)", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T03:30:00.000Z`,
                endTime: `2024-08-06T04:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 2, PER_WEEK: 2 }),
          })
        );

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            start: `2024-08-07T08:00:00.000Z`,
            end: `2024-08-07T08:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockBookingData })).rejects.toThrowError(
          "booking_limit_reached"
        );
      });

      test("Team booking with includeManagedEventsInLimits=true counts managed events", async ({}) => {
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
                  bookingLimits: { PER_DAY: 2 },
                  includeManagedEventsInLimits: true, // Include managed events
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
                  },
                ],
                teamId: 1,
                schedulingType: SchedulingType.MANAGED,
              },
              {
                id: 3,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                parent: {
                  id: 2,
                },
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 3,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T08:00:00.000Z`,
                endTime: `2024-08-05T08:30:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T09:00:00.000Z`,
            end: `2024-08-05T09:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(
          async () => await handleNewBooking({ bookingData: mockBookingData })
        ).rejects.toThrowError("no_available_users_found_error");
      });

      test("Boundary test: Booking count equals limit should fail", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T04:30:00.000Z`,
                endTime: `2024-08-05T05:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 2 }),
          })
        );

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockBookingData })).rejects.toThrowError(
          "booking_limit_reached"
        );
      });

      test("Only ACCEPTED bookings count toward limit", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.PENDING,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.CANCELLED,
                startTime: `2024-08-05T04:30:00.000Z`,
                endTime: `2024-08-05T05:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.REJECTED,
                startTime: `2024-08-05T05:30:00.000Z`,
                endTime: `2024-08-05T06:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 1 }),
          })
        );

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData });
        expect(createdBooking).toBeDefined();
      });
    });

    describe("Isolation: Team Limits vs User Global Limits", () => {
      test("User global limit does NOT count team bookings", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: SchedulingType.COLLECTIVE,
                teamId: 1,
                team: {
                  id: 1,
                },
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
              },
            ],
            bookings: [
              {
                // Team booking - should NOT count toward user's global limit
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T04:30:00.000Z`,
                endTime: `2024-08-05T05:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T05:30:00.000Z`,
                endTime: `2024-08-05T06:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 1 }), // User has strict 1 per day limit
          })
        );

        const mockPersonalBooking = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({ bookingData: mockPersonalBooking });
        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );
      });

      test("Team limit does NOT count personal bookings", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: SchedulingType.COLLECTIVE,
                teamId: 1,
                team: {
                  id: 1,
                  bookingLimits: { PER_DAY: 2 }, // Team has 2 per day limit
                },
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
              },
            ],
            bookings: [
              {
                // Personal booking - should NOT count toward team limit
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T04:30:00.000Z`,
                endTime: `2024-08-05T05:00:00.000Z`,
              },
              {
                // Team booking - counts toward team limit (1/2)
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T05:30:00.000Z`,
                endTime: `2024-08-05T06:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockTeamBooking = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({ bookingData: mockTeamBooking });
        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );
      });

      test("User can reach team limit and personal limit independently", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: SchedulingType.COLLECTIVE,
                teamId: 1,
                team: {
                  id: 1,
                  bookingLimits: { PER_DAY: 2 },
                },
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
              },
            ],
            bookings: [
              {
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T04:30:00.000Z`,
                endTime: `2024-08-05T05:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T05:30:00.000Z`,
                endTime: `2024-08-05T06:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 1 }), // User has 1 per day personal limit
          })
        );

        const mockPersonalBooking = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockPersonalBooking })).rejects.toThrowError(
          "booking_limit_reached"
        );

        const mockTeamBooking = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T09:00:00.000Z`,
            end: `2024-08-05T09:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(
          async () => await handleNewBooking({ bookingData: mockTeamBooking })
        ).rejects.toThrowError("no_available_users_found_error");
      });

      test("User with team bookings can still use all their personal booking slots", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: undefined,
                userId: 101,
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: SchedulingType.COLLECTIVE,
                teamId: 1,
                team: {
                  id: 1,
                  bookingLimits: { PER_DAY: 10 }, // High team limit
                },
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
              },
            ],
            bookings: [
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T04:30:00.000Z`,
                endTime: `2024-08-05T05:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T05:30:00.000Z`,
                endTime: `2024-08-05T06:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T06:30:00.000Z`,
                endTime: `2024-08-05T07:00:00.000Z`,
              },
              {
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T07:30:00.000Z`,
                endTime: `2024-08-05T08:00:00.000Z`,
              },
            ],
            organizer: organizerWithBookingLimits({ PER_DAY: 3 }), // User can have 3 personal bookings
          })
        );

        const mockBooking1 = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T09:00:00.000Z`,
            end: `2024-08-05T09:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const booking1 = await handleNewBooking({ bookingData: mockBooking1 });
        expect(booking1).toBeDefined();

        const mockBooking2 = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T10:00:00.000Z`,
            end: `2024-08-05T10:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const booking2 = await handleNewBooking({ bookingData: mockBooking2 });
        expect(booking2).toBeDefined();

        const mockBooking3 = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T11:00:00.000Z`,
            end: `2024-08-05T11:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const booking3 = await handleNewBooking({ bookingData: mockBooking3 });
        expect(booking3).toBeDefined();

        const mockBooking4 = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T12:00:00.000Z`,
            end: `2024-08-05T12:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(handleNewBooking({ bookingData: mockBooking4 })).rejects.toThrowError(
          "booking_limit_reached"
        );
      });

      test("Different teams have independent limits for the same user", async ({}) => {
        const handleNewBooking = getNewBookingHandler();
        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: SchedulingType.COLLECTIVE,
                teamId: 1,
                team: {
                  id: 1,
                  bookingLimits: { PER_DAY: 1 }, // Team 1 limit: 1 per day
                },
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
              },
              {
                id: 2,
                slotInterval: eventLength,
                length: eventLength,
                schedulingType: SchedulingType.COLLECTIVE,
                teamId: 2,
                team: {
                  id: 2,
                  bookingLimits: { PER_DAY: 1 }, // Team 2 limit: 1 per day
                },
                hosts: [
                  {
                    userId: 101,
                    isFixed: true,
                  },
                ],
              },
            ],
            bookings: [
              {
                // User 101 has 1 booking in Team 1 (at Team 1 limit)
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-05T03:30:00.000Z`,
                endTime: `2024-08-05T04:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockTeam2Booking = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T08:00:00.000Z`,
            end: `2024-08-05T08:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({ bookingData: mockTeam2Booking });
        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        const mockTeam1Booking = getMockRequestDataForBooking({
          data: {
            start: `2024-08-05T09:00:00.000Z`,
            end: `2024-08-05T09:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        await expect(
          async () => await handleNewBooking({ bookingData: mockTeam1Booking })
        ).rejects.toThrowError("no_available_users_found_error");
      });
    });
  },
  timeout
);
