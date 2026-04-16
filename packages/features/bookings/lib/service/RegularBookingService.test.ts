import {
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToCrashOnCreateEvent,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";
import { BookingStatus } from "@calcom/prisma/enums";
import { expectBookingToBeInDatabase } from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { describe } from "vitest";

const timeout = process.env.CI ? 5000 : 20000;

describe("RegularBookingService", () => {
  setupAndTeardown();

  describe("Calendar sync failure handling", () => {
    test(
      `should set booking to PENDING when all calendar event creations fail`,
      async () => {
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
          destinationCalendar: {
            integration: "google_calendar",
            externalId: "organizer@google-calendar.com",
          },
        });

        const plus1DateString = getDate({ dateIncrement: 1 }).dateString;

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                users: [{ id: 101 }],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                },
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

        // Mock calendar to CRASH on event creation — simulating API failure
        await mockCalendarToCrashOnCreateEvent("googlecalendar");

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:30:00.000Z`,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        });

        const regularBookingService = getRegularBookingService();
        const createdBooking = await regularBookingService.createBooking({
          bookingData: mockBookingData,
        });

        // After fix: booking should be PENDING when calendar sync fails,
        // so the user knows the calendar event was not created.
        await expectBookingToBeInDatabase({
          uid: createdBooking.uid,
          status: BookingStatus.PENDING,
        });
      },
      timeout
    );

    test(
      `should create booking successfully when calendar event creation succeeds`,
      async () => {
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
          destinationCalendar: {
            integration: "google_calendar",
            externalId: "organizer@google-calendar.com",
          },
        });

        const plus1DateString = getDate({ dateIncrement: 1 }).dateString;

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                users: [{ id: 101 }],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                },
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

        // Mock calendar to succeed
        await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:30:00.000Z`,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        });

        const regularBookingService = getRegularBookingService();
        const createdBooking = await regularBookingService.createBooking({
          bookingData: mockBookingData,
        });

        // Happy path: booking should be ACCEPTED with calendar references
        await expectBookingToBeInDatabase({
          uid: createdBooking.uid,
          status: BookingStatus.ACCEPTED,
        });
      },
      timeout
    );

    test(
      `should set booking to PENDING when calendar fails and no video integration is configured`,
      async () => {
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
          destinationCalendar: {
            integration: "google_calendar",
            externalId: "organizer@google-calendar.com",
          },
        });

        const plus1DateString = getDate({ dateIncrement: 1 }).dateString;

        await createBookingScenario(
          getScenarioData({
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                users: [{ id: 101 }],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                },
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"]],
          })
        );

        // No video mock — calendar-only scenario
        await mockCalendarToCrashOnCreateEvent("googlecalendar");

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:30:00.000Z`,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "attendee" },
            },
          },
        });

        const regularBookingService = getRegularBookingService();
        const createdBooking = await regularBookingService.createBooking({
          bookingData: mockBookingData,
        });

        await expectBookingToBeInDatabase({
          uid: createdBooking.uid,
          status: BookingStatus.PENDING,
        });
      },
      timeout
    );
  });
});
