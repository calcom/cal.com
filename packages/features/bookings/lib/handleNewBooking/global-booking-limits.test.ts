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
    beforeAll(async () => {
      vi.setSystemTime(new Date("2024-08-05")); //Monday
    });

    describe("Team Booking Limits", () => {
      // This test fails on CI as handleNewBooking throws no_available_users_found_error error
      // eslint-disable-next-line playwright/no-skipped-test
      test(`Booking limits per week
    `, async ({}) => {
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
                  includePersonalEventsInLimits: false,
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
                  includeManagedEventsInLimits: false,
                  includePersonalEventsInLimits: false,
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
                  includePersonalEventsInLimits: false,
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
                  includePersonalEventsInLimits: false,
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

      test(`Booking limits per week - includePersonalEventsInLimits: true (personal events should count towards team limits)`, async ({}) => {
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
                  bookingLimits: { PER_WEEK: 3 },
                  includeManagedEventsInLimits: false,
                  includePersonalEventsInLimits: true,
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
                // Personal event type (no teamId, has userId)
                id: 5,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                // No teamId means this is a personal event type
              },
            ],
            bookings: [
              {
                // Team event booking
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T03:30:00.000Z`,
                endTime: `2024-08-06T04:00:00.000Z`,
              },
              {
                // Team event booking
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T04:00:00.000Z`,
                endTime: `2024-08-06T04:30:00.000Z`,
              },
              {
                // Personal event booking - this SHOULD count towards team limits when includePersonalEventsInLimits: true
                eventTypeId: 5,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-07T03:30:00.000Z`,
                endTime: `2024-08-07T04:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
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

        // This is the fourth booking of this week for user 101 (2 team + 1 personal that counts), limit reached
        await expect(
          async () =>
            await handleNewBooking({
              bookingData: mockBookingAboveLimit,
            })
        ).rejects.toThrowError("no_available_users_found_error");
      });

      test(`Booking limits per week - includePersonalEventsInLimits: false (personal events should NOT count towards team limits)`, async ({}) => {
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
                  bookingLimits: { PER_WEEK: 3 },
                  includeManagedEventsInLimits: false,
                  includePersonalEventsInLimits: false,
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
                // Personal event type (no teamId, has userId)
                id: 5,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                // No teamId means this is a personal event type
              },
            ],
            bookings: [
              {
                // Team event booking
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T03:30:00.000Z`,
                endTime: `2024-08-06T04:00:00.000Z`,
              },
              {
                // Team event booking
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-06T04:00:00.000Z`,
                endTime: `2024-08-06T04:30:00.000Z`,
              },
              {
                // Personal event booking - this should NOT count towards team limits when includePersonalEventsInLimits: false
                eventTypeId: 5,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-07T03:30:00.000Z`,
                endTime: `2024-08-07T04:00:00.000Z`,
              },
              {
                // Another personal event booking - this should also NOT count towards team limits
                eventTypeId: 5,
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

        // This should succeed because only 2 team bookings count towards the limit (personal bookings are ignored)
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
            start: `2024-08-08T05:00:00.000Z`,
            end: `2024-08-08T05:30:00.000Z`,
            eventTypeId: 2,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        // This should fail because it would be the fourth team booking this week (limit is 3)
        await expect(
          async () =>
            await handleNewBooking({
              bookingData: mockBookingAboveLimit,
            })
        ).rejects.toThrowError("no_available_users_found_error");
      });

      test(`Booking limits per month - includePersonalEventsInLimits: true (combined scenario with managed and personal events)`, async ({}) => {
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
                  bookingLimits: { PER_MONTH: 5 },
                  includeManagedEventsInLimits: true,
                  includePersonalEventsInLimits: true,
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
              {
                // Personal event type (no teamId, has userId)
                id: 5,
                slotInterval: eventLength,
                length: eventLength,
                userId: 101,
                // No teamId means this is a personal event type
              },
            ],
            bookings: [
              {
                // Team collective event booking
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-03T03:30:00.000Z`,
                endTime: `2024-08-03T04:00:00.000Z`,
              },
              {
                // Team collective event booking
                eventTypeId: 2,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-10T03:30:00.000Z`,
                endTime: `2024-08-10T04:00:00.000Z`,
              },
              {
                // Managed event booking - should count towards limits
                eventTypeId: 4,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-15T03:30:00.000Z`,
                endTime: `2024-08-15T04:00:00.000Z`,
              },
              {
                // Personal event booking - should count towards limits when includePersonalEventsInLimits: true
                eventTypeId: 5,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-20T03:30:00.000Z`,
                endTime: `2024-08-20T04:00:00.000Z`,
              },
              {
                // Another personal event booking - should also count towards limits
                eventTypeId: 5,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `2024-08-25T03:30:00.000Z`,
                endTime: `2024-08-25T04:00:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
          })
        );

        const mockBookingAboveLimit = getMockRequestDataForBooking({
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

        // This is the sixth booking of this month for user 101 (2 team + 1 managed + 2 personal), limit reached
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
