import { v4 as uuidv4 } from "uuid";
import { describe, expect } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectWorkflowToBeTriggered,
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectBookingCreatedWebhookToHaveBeenFired,
  expectSuccessfulCalendarEventCreationInCalendar,
} from "@calcom/web/test/utils/bookingScenario/expects";

import { createMockNextJsRequest } from "./lib/createMockNextJsRequest";
import { getMockRequestDataForBooking } from "./lib/getMockRequestDataForBooking";
import { setupAndTeardown } from "./lib/setupAndTeardown";

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;
describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Recurring EventType:", () => {
    test(
      `should create a successful booking with Cal Video(Daily Video) if no explicit location is provided
			1. Should create a booking in the database
			2. Should send emails to the booker as well as organizer
			3. Should create a booking in the event's destination calendar
			3. Should trigger BOOKING_CREATED webhook
	  `,
      async ({ emails }) => {
        const handleRecurringEventBooking = (await import("@calcom/web/pages/api/book/recurring-event"))
          .handleRecurringEventBooking;
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

        const recurrence = getRecurrence({
          type: "weekly",
          numberOfOccurrences: 3,
        });

        await createBookingScenario(
          getScenarioData({
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
                slotInterval: 45,
                length: 45,
                recurringEvent: recurrence,
                users: [
                  {
                    id: 101,
                  },
                ],
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

        const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
        });

        const recurringCountInRequest = 2;
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            recurringEventId: uuidv4(),
            recurringCount: recurringCountInRequest,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
            },
          },
        });

        const numOfSlotsToBeBooked = 4;
        const { req, res } = createMockNextJsRequest({
          method: "POST",
          body: Array(numOfSlotsToBeBooked)
            .fill(mockBookingData)
            .map((mockBookingData, index) => {
              return {
                ...mockBookingData,
                start: new Date(
                  new Date(mockBookingData.start).getTime() + index * 1000 * 60 * 60 * 24
                ).toISOString(), // 1 day apart
                end: new Date(
                  new Date(mockBookingData.end).getTime() + index * 1000 * 60 * 60 * 24
                ).toISOString(), // 1 day apart
              };
            }),
        });

        const createdBookings = await handleRecurringEventBooking(req, res);
        expect(createdBookings.length).toBe(numOfSlotsToBeBooked);
        for (const [index, createdBooking] of Object.entries(createdBookings)) {
          logger.debug("Assertion for Booking with index:", index, { createdBooking });
          expect(createdBooking.responses).toContain({
            email: booker.email,
            name: booker.name,
          });

          expect(createdBooking).toContain({
            location: "integrations:daily",
          });

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
            recurringEventId: mockBookingData.recurringEventId,
            references: [
              {
                type: "daily_video",
                uid: "MOCK_ID",
                meetingId: "MOCK_ID",
                meetingPassword: "MOCK_PASS",
                meetingUrl: "http://mock-dailyvideo.example.com/meeting-1",
              },
              {
                type: "google_calendar",
                uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingPassword: "MOCK_PASSWORD",
                meetingUrl: "https://UNUSED_URL",
              },
            ],
          });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
            subscriberUrl: "http://my-webhook.example.com",
            //FIXME: File a bug - All recurring bookings seem to have the same URL. They should have same CalVideo URL which could mean that future recurring meetings would have already expired by the time they are needed.
            videoCallUrl: `${WEBAPP_URL}/video/${createdBookings[0].uid}`,
          });
        }

        expectWorkflowToBeTriggered();

        expectSuccessfulBookingCreationEmails({
          booker,
          organizer,
          emails,
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          recurrence: {
            ...recurrence,
            count: recurringCountInRequest,
          },
        });

        expectSuccessfulCalendarEventCreationInCalendar(calendarMock, [
          {
            calendarId: "event-type-1@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
          },
          {
            calendarId: "event-type-1@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
          },
          {
            calendarId: "event-type-1@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
          },
          {
            calendarId: "event-type-1@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
          },
        ]);
      },
      timeout
    );
  });

  function getRecurrence({
    type,
    numberOfOccurrences,
  }: {
    type: "weekly" | "monthly" | "yearly";
    numberOfOccurrences: number;
  }) {
    const freq = type === "yearly" ? 0 : type === "monthly" ? 1 : 2;
    return { freq, count: numberOfOccurrences, interval: 1 };
  }
});
