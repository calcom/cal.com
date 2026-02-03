/**
 * These tests are integration tests that test the flow from receiving a api/book/event request and then verifying
 * - database entries created in In-MEMORY DB using prismock
 * - emails sent by checking the testEmails global variable
 * - webhooks fired by mocking fetch
 * - APIs of various apps called by mocking those apps' modules
 *
 * They don't intend to test what the apps logic should do, but rather test if the apps are called with the correct data. For testing that, once should write tests within each app.
 */
import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockCalendar,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { expectBookingToBeInDatabase } from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForDynamicGroupBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();
  describe("Dynamic Group Booking", () => {
    test(
      `should allow a booking if there is no conflicting booking in any of the users' selectedCalendars`,
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const groupUserId1 = 101;
        const groupUserId2 = 102;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const groupUser1 = getOrganizer({
          name: "group-user-1",
          username: "group-user-1",
          email: "group-user-1@example.com",
          id: groupUserId1,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [],
          selectedCalendars: [],
        });

        const groupUser2 = getOrganizer({
          name: "group-user-2",
          username: "group-user-2",
          email: "group-user-2@example.com",
          id: groupUserId2,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [],
          selectedCalendars: [],
        });

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [],
            webhooks: [
              {
                userId: groupUserId1,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl: "http://my-webhook.example.com",
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            users: [groupUser1, groupUser2],
            apps: [TestData.apps["google-calendar"]],
          })
        );

        const _calendarMock = mockCalendar("googlecalendar", {
          create: {
            uid: "MOCK_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
          busySlots: [
            {
              start: `${plus1DateString}T05:00:00.000Z`,
              end: `${plus1DateString}T05:15:00.000Z`,
            },
          ],
        });

        const mockBookingData = getMockRequestDataForDynamicGroupBooking({
          data: {
            start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
            end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
            eventTypeId: 0,
            eventTypeSlug: "group-user-1+group-user-2",
            user: "group-user-1+group-user-2",
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        await expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          uid: createdBooking.uid!,
          eventTypeId: null,
          status: BookingStatus.ACCEPTED,
          iCalUID: createdBooking.iCalUID,
        });
      },
      timeout
    );

    test(
      `should correctly assign the first user in the URL as the organizer`,
      async () => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        // Create two users where alphabetically the second would come first
        const userZebra = getOrganizer({
          name: "Zebra User",
          username: "zebra",
          email: "zebra@example.com",
          id: 201,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [],
          selectedCalendars: [],
        });

        const userAlpha = getOrganizer({
          name: "Alpha User",
          username: "alpha",
          email: "alpha@example.com",
          id: 202,
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [],
          selectedCalendars: [],
        });

        await createBookingScenario(
          getScenarioData({
            eventTypes: [],
            users: [userZebra, userAlpha],
          })
        );

        // Book with zebra first in the URL - zebra should be the organizer
        const mockBookingDataZebraFirst = getMockRequestDataForDynamicGroupBooking({
          data: {
            start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
            end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
            eventTypeId: 0,
            eventTypeSlug: "zebra+alpha",
            user: "zebra+alpha",
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const bookingZebraFirst = await handleNewBooking({
          bookingData: mockBookingDataZebraFirst,
        });

        await expectBookingToBeInDatabase({
          description: "",
          uid: bookingZebraFirst.uid!,
          eventTypeId: null,
          status: BookingStatus.ACCEPTED,
          iCalUID: bookingZebraFirst.iCalUID,
        });

        // Verify zebra is the organizer (the booking.userId should be zebra's id)
        expect(bookingZebraFirst.userId).toBe(userZebra.id);

        // Book with alpha first in the URL - alpha should be the organizer
        const mockBookingDataAlphaFirst = getMockRequestDataForDynamicGroupBooking({
          data: {
            start: `${getDate({ dateIncrement: 1 }).dateString}T06:00:00.000Z`,
            end: `${getDate({ dateIncrement: 1 }).dateString}T06:30:00.000Z`,
            eventTypeId: 0,
            eventTypeSlug: "alpha+zebra",
            user: "alpha+zebra",
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const bookingAlphaFirst = await handleNewBooking({
          bookingData: mockBookingDataAlphaFirst,
        });

        await expectBookingToBeInDatabase({
          description: "",
          uid: bookingAlphaFirst.uid!,
          eventTypeId: null,
          status: BookingStatus.ACCEPTED,
          iCalUID: bookingAlphaFirst.iCalUID,
        });

        // Verify alpha is the organizer (the booking.userId should be alpha's id)
        expect(bookingAlphaFirst.userId).toBe(userAlpha.id);
      },
      timeout
    );

    describe("Availability Check During Booking", () => {
      test(
        `should fail a booking if there is already a conflicting booking in the first user's selectedCalendars`,
        async () => {
          const handleNewBooking = getNewBookingHandler();
          const groupUserId1 = 101;
          const groupUserId2 = 102;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const groupUser1 = getOrganizer({
            name: "group-user-1",
            username: "group-user-1",
            email: "group-user-1@example.com",
            id: groupUserId1,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          });

          const groupUser2 = getOrganizer({
            name: "group-user-2",
            username: "group-user-2",
            email: "group-user-2@example.com",
            id: groupUserId2,
            schedules: [TestData.schedules.IstWorkHours],
            // Second user has no selected calendars and credentials
            credentials: [],
            selectedCalendars: [],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [],
              users: [groupUser1, groupUser2],
              apps: [TestData.apps["google-calendar"]],
            })
          );

          const _calendarMock = mockCalendar("googlecalendar", {
            create: {
              uid: "MOCK_ID",
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            },
            busySlots: [
              {
                start: `${plus1DateString}T05:00:00.000Z`,
                end: `${plus1DateString}T05:15:00.000Z`,
              },
            ],
          });

          const mockBookingData = getMockRequestDataForDynamicGroupBooking({
            data: {
              start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
              end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
              eventTypeId: 0,
              eventTypeSlug: "group-user-1+group-user-2",
              user: "group-user-1+group-user-2",
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
          ).rejects.toThrowError(ErrorCode.FixedHostsUnavailableForBooking);
        },
        timeout
      );

      test(
        `should fail a booking if there is already a conflicting booking in the second user's selectedCalendars`,
        async () => {
          const handleNewBooking = getNewBookingHandler();
          const groupUserId1 = 101;
          const groupUserId2 = 102;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const groupUser1 = getOrganizer({
            name: "group-user-1",
            username: "group-user-1",
            email: "group-user-1@example.com",
            id: groupUserId1,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [],
            selectedCalendars: [],
          });

          const groupUser2 = getOrganizer({
            name: "group-user-2",
            username: "group-user-2",
            email: "group-user-2@example.com",
            id: groupUserId2,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          });

          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [],
              webhooks: [
                {
                  userId: groupUserId1,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl: "http://my-webhook.example.com",
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              users: [groupUser1, groupUser2],
              apps: [TestData.apps["google-calendar"]],
            })
          );

          const _calendarMock = mockCalendar("googlecalendar", {
            create: {
              uid: "MOCK_ID",
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
            },
            busySlots: [
              {
                start: `${plus1DateString}T05:00:00.000Z`,
                end: `${plus1DateString}T05:15:00.000Z`,
              },
            ],
          });

          const mockBookingData = getMockRequestDataForDynamicGroupBooking({
            data: {
              start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
              end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
              eventTypeId: 0,
              eventTypeSlug: "group-user-1+group-user-2",
              user: "group-user-1+group-user-2",
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
          ).rejects.toThrowError(ErrorCode.FixedHostsUnavailableForBooking);
        },
        timeout
      );
    });
  });
});
