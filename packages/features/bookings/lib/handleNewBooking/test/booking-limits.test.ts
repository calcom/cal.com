/**
 * These integration tests aim to cover difficult-to-test edge cases
 * Standard cases are currently handled in e2e tests only
 *
 * see: https://github.com/calcom/cal.com/pull/10480
 *      https://github.com/calcom/cal.com/pull/10968
 */
import prismock from "@calcom/testing/lib/__mocks__/prisma";

import {
  TestData,
  createBookingScenario,
  getBooker,
  getDate,
  getNextMonthNotStartingOnWeekStart,
  getOrganizer,
  getScenarioData,
  getGoogleCalendarCredential,
  BookingLocations,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { expectBookingToBeInDatabase } from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { describe, expect, vi } from "vitest";

import { PeriodType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

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
          const handleNewBooking = getNewBookingHandler();

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

          await expect(
            async () =>
              await handleNewBooking({
                bookingData: mockBookingData,
              })
          ).rejects.toThrowError("booking_limit_reached");

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

          const createdBooking = await handleNewBooking({
            bookingData: mockBookingDataFollowingYear,
          });

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
          const handleNewBooking = getNewBookingHandler();

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

          vi.spyOn(prismock, "$queryRaw").mockResolvedValue([{ totalMinutes: yearlyDurationLimit }]);

          await expect(
            async () =>
              await handleNewBooking({
                bookingData: mockBookingData,
              })
          ).rejects.toThrowError("duration_limit_reached");

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

          vi.spyOn(prismock, "$queryRaw").mockResolvedValue([{ totalMinutes: 0 }]);

          const createdBooking = await handleNewBooking({
            bookingData: mockBookingDataFollowingYear,
          });

          expect(createdBooking.responses).toEqual(
            expect.objectContaining({
              email: booker.email,
              name: booker.name,
            })
          );

          expect(createdBooking).toEqual(
            expect.objectContaining({
              location: "New York",
            })
          );

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
          const handleNewBooking = getNewBookingHandler();

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

          await expect(
            async () =>
              await handleNewBooking({
                bookingData: mockBookingData,
              })
          ).rejects.toThrowError("booking_limit_reached");
        },
        timeout
      );

      test(
        `should fail a booking if exceeds booking limits with bookings in week across two months`,
        async ({}) => {
          const handleNewBooking = getNewBookingHandler();

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

          await expect(
            async () =>
              await handleNewBooking({
                bookingData: mockBookingData,
              })
          ).rejects.toThrowError("booking_limit_reached");
        },
        timeout
      );
    },
    timeout
  );

  describe("Buffers", () => {
    test("should throw error when booking is not respecting buffers with event types that have before and after buffer ", async ({}) => {
      const handleNewBooking = getNewBookingHandler();

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

      const { dateString: nextDayDateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              beforeEventBuffer: 60,
              afterEventBuffer: 60,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${nextDayDateString}T07:00:00.000Z`,
              endTime: `${nextDayDateString}T07:15:00.000Z`,
            },
          ],
          organizer,
        })
      );

      // 7:00 - 7:15 busy
      // 6:00 - 7:00 before event buffer
      // 5:00 - 6:00 after event buffer
      const mockBookingBeforeData = getMockRequestDataForBooking({
        data: {
          start: `${nextDayDateString}T05:15:00.000Z`,
          end: `${nextDayDateString}T05:30:00.000Z`,
          eventTypeId: 1,
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
            bookingData: mockBookingBeforeData,
          })
      ).rejects.toThrowError("no_available_users_found_error");

      // 7:00 - 7:15 busy
      // 7:17 - 8:15 after event buffer
      // 8:15 - 9:15 before event buffer
      const mockBookingAfterData = getMockRequestDataForBooking({
        data: {
          start: `${nextDayDateString}T09:00:00.000Z`,
          end: `${nextDayDateString}T09:15:00.000Z`,
          eventTypeId: 1,
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
            bookingData: mockBookingAfterData,
          })
      ).rejects.toThrowError("no_available_users_found_error");
    });

    test(`should throw error when booking is within a before event buffer of an existing booking
        `, async ({}) => {
      const handleNewBooking = getNewBookingHandler();

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

      const { dateString: nextDayDateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              beforeEventBuffer: 60,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${nextDayDateString}T05:00:00.000Z`,
              endTime: `${nextDayDateString}T05:15:00.000Z`,
            },
          ],
          organizer,
        })
      );

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          start: `${nextDayDateString}T04:30:00.000Z`,
          end: `${nextDayDateString}T04:45:00.000Z`,
          eventTypeId: 1,
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
            bookingData: mockBookingData,
          })
      ).rejects.toThrowError("no_available_users_found_error");
    });
  });
  test(`should throw error when booking is within a after event buffer of an existing booking
        `, async ({}) => {
    const handleNewBooking = getNewBookingHandler();

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

    const { dateString: nextDayDateString } = getDate({ dateIncrement: 1 });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 15,
            length: 15,
            afterEventBuffer: 60,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        bookings: [
          {
            eventTypeId: 1,
            userId: 101,
            status: BookingStatus.ACCEPTED,
            startTime: `${nextDayDateString}T05:00:00.000Z`,
            endTime: `${nextDayDateString}T05:15:00.000Z`,
          },
        ],
        organizer,
      })
    );

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        start: `${nextDayDateString}T05:30:00.000Z`,
        end: `${nextDayDateString}T05:45:00.000Z`,
        eventTypeId: 1,
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
          bookingData: mockBookingData,
        })
    ).rejects.toThrowError("no_available_users_found_error");
  });

  test(
    `should fail booking if the start date is in the past`,
    async ({}) => {
      const handleNewBooking = getNewBookingHandler();
      const booker = getBooker({
        email: "booker@example.com",
        name: "Booker",
      });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const mockBookingData = getMockRequestDataForBooking({
        data: {
          user: organizer.username,
          eventTypeId: 1,
          start: `${getDate({ dateIncrement: -1 }).dateString}T05:00:00.000Z`,
          end: `${getDate({ dateIncrement: -1 }).dateString}T05:30:00.000Z`,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "New York" },
          },
        },
      });

      const scenarioData = getScenarioData({
        webhooks: [
          {
            userId: organizer.id,
            eventTriggers: ["BOOKING_CREATED"],
            subscriberUrl: "http://my-webhook.example.com",
            active: true,
            eventTypeId: 1,
            appId: null,
          },
        ],
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        organizer,
        apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
      });

      mockCalendarToHaveNoBusySlots("googlecalendar", {});
      await createBookingScenario(scenarioData);

      await expect(
        async () =>
          await handleNewBooking({
            bookingData: mockBookingData,
          })
      ).rejects.toThrowError("Attempting to book a meeting in the past.");
    },
    timeout
  );

  describe("Future Limits", () => {
    test(
      `should fail booking if periodType=ROLLING check fails`,
      async () => {
        // In IST it is 2024-05-22 12:39am
        vi.setSystemTime("2024-05-21T19:09:13Z");
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerOtherEmail = "organizer2@example.com";

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          destinationCalendar: {
            integration: "google_calendar",
            externalId: "organizer@google-calendar.com",
            primaryEmail: organizerOtherEmail,
          },
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                periodType: PeriodType.ROLLING,
                // 22st, 23nd and 24th in IST availability(Schedule being used is ISTWorkHours)
                periodDays: 2,
                periodCountCalendarDays: true,
                length: 30,
                useEventTypeDestinationCalendarEmail: true,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
            apps: [],
          })
        );

        const plus3DateString = `2024-05-25`;
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            // plus2Date timeslot being booked
            start: `${plus3DateString}T05:00:00.000Z`,
            end: `${plus3DateString}T05:30:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
          },
        });

        mockSuccessfulVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
          videoMeetingData: {
            id: "MOCK_ID",
            password: "MOCK_PASS",
            url: `http://mock-dailyvideo.example.com/meeting-1`,
          },
        });

        await expect(
          async () =>
            await handleNewBooking({
              bookingData: mockBookingData,
            })
        ).rejects.toThrowError("booking_time_out_of_bounds_error");
      },
      timeout
    );
  });
});
