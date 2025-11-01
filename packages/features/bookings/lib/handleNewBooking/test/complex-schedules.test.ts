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
import {
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectSuccessfulCalendarEventCreationInCalendar,
  expectICalUIDAsString,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { getNewBookingHandler } from "./getNewBookingHandler";

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

  describe("Complex schedules:", () => {
    test(
      `should be able to book the last slot before midnight`,
      async ({ emails }) => {
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const newYorkTimeZone = Timezones["-05:00"];
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        // Using .endOf("day") here to ensure our date doesn't change when we set the time zone
        // Book the last slot before midnight: 23:00-00:00 local (ending at midnight)
        let startDateTimeOrganizerTz = dayjs(plus1DateString)
          .endOf("day")
          .tz(newYorkTimeZone)
          .hour(23)
          .minute(0)
          .second(0);

        let endDateTimeOrganizerTz = dayjs(plus1DateString)
          .endOf("day")
          .tz(newYorkTimeZone)
          .startOf("day")
          .add(1, "day");

        const endUtcOffset = Math.abs(endDateTimeOrganizerTz.utcOffset());
        const startUtcOffset = Math.abs(startDateTimeOrganizerTz.utcOffset());
        if (startUtcOffset !== endUtcOffset) {
          if (endUtcOffset > startUtcOffset) {
            endDateTimeOrganizerTz = endDateTimeOrganizerTz.subtract(
              endUtcOffset - startUtcOffset,
              "minutes"
            );
          } else {
            startDateTimeOrganizerTz = startDateTimeOrganizerTz.add(startUtcOffset - endUtcOffset, "minutes");
          }
        }

        // Final safety: if UTC instants still match or duration is <= 0, force end to be start + 60 minutes
        // This ensures the slot ends at midnight (00:00) of the next day
        const utcStart = startDateTimeOrganizerTz.utc().valueOf();
        const utcEnd = endDateTimeOrganizerTz.utc().valueOf();
        if (utcStart >= utcEnd) {
          endDateTimeOrganizerTz = startDateTimeOrganizerTz.add(60, "minutes");
        }

        // Schedule with two blocks to explicitly cover 23:00-00:00 slot that crosses midnight
        // Block 1: 16:00-24:00 covers the evening hours up to midnight
        // Block 2: 00:00-01:00 covers the first hour after midnight for bookings ending at 00:00
        const schedule = {
          name: "4:00PM to 12:00AM in New York",
          availability: [
            {
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: dayjs("1970-01-01").utc().hour(16).toDate(), // 16:00 local
              endTime: dayjs("1970-01-02").utc().startOf("day").toDate(), // 24:00 local (midnight)
              date: null,
            },
            {
              days: [0, 1, 2, 3, 4, 5, 6],
              startTime: dayjs("1970-01-01").utc().startOf("day").toDate(), // 00:00 local
              endTime: dayjs("1970-01-01").utc().hour(1).toDate(), // 01:00 local
              date: null,
            },
          ],
          timeZone: newYorkTimeZone,
        };

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          schedules: [schedule],
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
        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
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
            start: startDateTimeOrganizerTz.format(),
            end: endDateTimeOrganizerTz.format(),
            timeZone: Timezones["-05:00"],
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });
        expect(createdBooking.responses).toEqual(
          expect.objectContaining({
            email: booker.email,
            name: booker.name,
          })
        );

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.CalVideo,
          })
        );

        await expectBookingToBeInDatabase({
          description: "",
           
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
