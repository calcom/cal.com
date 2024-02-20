/**
 * These tests are integration tests that test the flow from receiving a api/book/event request and then verifying
 * - database entries created in In-MEMORY DB using prismock
 * - emails sent by checking the testEmails global variable
 * - webhooks fired by mocking fetch
 * - APIs of various apps called by mocking those apps' modules
 *
 * They don't intend to test what the apps logic should do, but rather test if the apps are called with the correct data. For testing that, once should write tests within each app.
 */
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getDate,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  BookingLocations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import {
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectSuccessfulCalendarEventCreationInCalendar,
  expectICalUIDAsString,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

export const Timezones = {
  "-05:00": "America/New_York",
  "00:00": "Europe/London",
};

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Booking for slot only available by date override:", () => {
    describe("Calendar events should be created in the appropriate calendar", () => {
      test(
        `should create a successful booking in the first connected calendar i.e. using the first credential(in the scenario when there is no event-type or organizer destination calendar)
          1. Should create a booking in the database
          2. Should send emails to the booker as well as organizer
          3. Should fallback to creating the booking in the first connected Calendar when neither event nor organizer has a destination calendar - This doesn't practically happen because organizer is always required to have a schedule set
          3. Should trigger BOOKING_CREATED webhook
    `,
        async ({ emails }) => {
          const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
          console.log("------plus1DateString", plus1DateString);
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const overrideSchedule = {
            name: "11:00AM to 12PM in New York",
            availability: [
              {
                days: [],
                startTime: new Date(`1970-01-01T16:00:00.000Z`),
                endTime: new Date(`1970-01-01T17:00:00.000Z`),
                date: plus1DateString,
              },
            ],
            timeZone: Timezones["-05:00"],
          };

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [overrideSchedule],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          });

          await createBookingScenario(
            getScenarioData({
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 60,
                  length: 60,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                },
              ],
              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            })
          );

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
            videoMeetingData: {
              id: "MOCK_ID",
              password: "MOCK_PASS",
              url: `http://mock-dailyvideo.example.com/meeting-1`,
            },
          });

          // Mock a Scenario where iCalUID isn't returned by Google Calendar in which case booking UID is used as the ics UID
          const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
            create: {
              id: "GOOGLE_CALENDAR_EVENT_ID",
              uid: "MOCK_ID",
            },
          });

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
              start: dayjs(plus1DateString).hour(16).minute(0).second(0).utc().toISOString(),
              end: dayjs(plus1DateString).hour(17).minute(0).second(0).utc().toISOString(),
              timeZone: Timezones["-05:00"],
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          const createdBooking = await handleNewBooking(req);
          expect(createdBooking.responses).toContain({
            email: booker.email,
            name: booker.name,
          });

          expect(createdBooking).toContain({
            location: BookingLocations.CalVideo,
          });

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
            references: [
              {
                type: appStoreMetadata.dailyvideo.type,
                uid: "MOCK_ID",
                meetingId: "MOCK_ID",
                meetingPassword: "MOCK_PASS",
                meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
              },
              {
                type: appStoreMetadata.googlecalendar.type,
                uid: "GOOGLE_CALENDAR_EVENT_ID",
                meetingId: "GOOGLE_CALENDAR_EVENT_ID",
                meetingPassword: "MOCK_PASSWORD",
                meetingUrl: "https://UNUSED_URL",
              },
            ],
            iCalUID: createdBooking.iCalUID,
          });

          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
            // We won't be sending evt.destinationCalendar in this case.
            // Google Calendar in this case fallbacks to the "primary" calendar - https://github.com/calcom/cal.com/blob/7d5dad7fea78ff24dddbe44f1da5d7e08e1ff568/packages/app-store/googlecalendar/lib/CalendarService.ts#L217
            // Not sure if it's the correct behaviour. Right now, it isn't possible to have an organizer with connected calendar but no destination calendar - As soon as the Google Calendar app is installed, a destination calendar is created.
            calendarId: null,
          });

          const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

          expectSuccessfulBookingCreationEmails({
            booking: {
              uid: createdBooking.uid!,
            },
            booker,
            organizer,
            emails,
            iCalUID,
          });
        },
        timeout
      );
    });
  });
});
