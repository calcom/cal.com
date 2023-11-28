import { v4 as uuidv4 } from "uuid";
import { describe, expect } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
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
  getDate,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import {
  expectWorkflowToBeTriggered,
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectBookingCreatedWebhookToHaveBeenFired,
  expectSuccessfulCalendarEventCreationInCalendar,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function getPlusDayDate(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * DAY_IN_MS);
}

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;
describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Recurring EventType:", () => {
    test(
      `should create successful bookings for the number of slots requested
        1. Should create the same number of bookings as requested slots in the database
        2. Should send emails for the first booking only to the booker as well as organizer
        3. Should create a calendar event for every booking in the destination calendar
        3. Should trigger BOOKING_CREATED webhook for every booking
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
        const plus1DateString = getDate({ dateIncrement: 1 }).dateString;
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
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:30:00.000Z`,
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
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
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
            //FIXME: All recurring bookings seem to have the same URL. https://github.com/calcom/cal.com/issues/11955
            videoCallUrl: `${WEBAPP_URL}/video/${createdBookings[0].uid}`,
          });
        }

        expectWorkflowToBeTriggered();

        expectSuccessfulBookingCreationEmails({
          booker,
          booking: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBookings[0].uid!,
            urlOrigin: WEBAPP_URL,
          },
          organizer,
          emails,
          bookingTimeRange: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            start: createdBookings[0].startTime!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            end: createdBookings[0].endTime!,
          },
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          recurrence: {
            ...recurrence,
            count: recurringCountInRequest,
          },
        });

        expect(emails.get().length).toBe(2);

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

    test(
      `should fail recurring booking if second slot is already booked`,
      async ({}) => {
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
        const plus1DateString = getDate({ dateIncrement: 1 }).dateString;
        const plus2DateString = getDate({ dateIncrement: 2 }).dateString;
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
            bookings: [
              {
                uid: "booking-1-uid",
                eventTypeId: 1,
                userId: organizer.id,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus2DateString}T04:00:00.000Z`,
                endTime: `${plus2DateString}T04:30:00.000Z`,
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

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
        });

        const recurringCountInRequest = 2;
        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:30:00.000Z`,
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
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
              };
            }),
        });

        expect(() => handleRecurringEventBooking(req, res)).rejects.toThrow(ErrorCode.NoAvailableUsersFound);
        // Actually the first booking goes through in this case but the status is still a failure. We should do a dry run to check if booking is possible  for the 2 slots and if yes, then only go for the actual booking otherwise fail the recurring bookign
      },
      timeout
    );

    test(
      `should create successful bookings for the number of slots requested even if the third slot is already booked as long as first two slots are free
        1. Should create the same number of bookings as requested slots in the database
        2. Should send emails for the first booking only to the booker as well as organizer
        3. Should create a calendar event for every booking in the destination calendar
        3. Should trigger BOOKING_CREATED webhook for every booking
    `,
      async ({ emails }) => {
        const recurringCountInRequest = 4;

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
        const plus1DateString = getDate({ dateIncrement: 1 }).dateString;
        const plus3DateString = getDate({ dateIncrement: 3 }).dateString;
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
            bookings: [
              {
                uid: "booking-1-uid",
                eventTypeId: 1,
                userId: organizer.id,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus3DateString}T04:00:00.000Z`,
                endTime: `${plus3DateString}T04:30:00.000Z`,
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

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:30:00.000Z`,
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
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
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
          booking: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBookings[0].uid!,
            urlOrigin: WEBAPP_URL,
          },
          organizer,
          emails,
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          recurrence: {
            ...recurrence,
            count: recurringCountInRequest,
          },
        });

        expect(emails.get().length).toBe(2);

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

    test(
      `should create successful bookings for the number of slots requested even if the last slot is already booked as long as first two slots are free
        1. Should create the same number of bookings as requested slots in the database
        2. Should send emails for the first booking only to the booker as well as organizer
        3. Should create a calendar event for every booking in the destination calendar
        3. Should trigger BOOKING_CREATED webhook for every booking
    `,
      async ({ emails }) => {
        const recurringCountInRequest = 4;

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
        const plus1DateString = getDate({ dateIncrement: 1 }).dateString;
        const plus4DateString = getDate({ dateIncrement: 4 }).dateString;
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
            bookings: [
              {
                uid: "booking-1-uid",
                eventTypeId: 1,
                userId: organizer.id,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus4DateString}T04:00:00.000Z`,
                endTime: `${plus4DateString}T04:30:00.000Z`,
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

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:30:00.000Z`,
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
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
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
          booking: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBookings[0].uid!,
            urlOrigin: WEBAPP_URL,
          },
          booker,
          organizer,
          emails,
          iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          recurrence: {
            ...recurrence,
            count: recurringCountInRequest,
          },
        });

        expect(emails.get().length).toBe(2);

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
