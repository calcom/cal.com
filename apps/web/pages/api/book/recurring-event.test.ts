import {
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
  Timezones,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import logger from "@calcom/lib/logger";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { createMockNextJsRequest } from "@calcom/testing/lib/bookingScenario/createMockNextJsRequest";
import {
  expectBookingCreatedWebhookToHaveBeenFired,
  expectBookingToBeInDatabase, // expectWorkflowToBeTriggered,
  expectSuccessfulBookingCreationEmails,
  expectSuccessfulCalendarEventCreationInCalendar,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { v4 as uuidv4 } from "uuid";
import { describe, expect } from "vitest";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function getPlusDayDate(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * DAY_IN_MS);
}

// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;
describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Recurring EventType:", () => {
    describe("User event type:", () => {
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
                  slotInterval: 30,
                  length: 30,
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

          const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
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

          const createdBookings = await handleRecurringEventBooking(req);
          expect(createdBookings.length).toBe(numOfSlotsToBeBooked);
          for (const [index, createdBooking] of Object.entries(createdBookings)) {
            logger.debug("Assertion for Booking with index:", index, { createdBooking });
            expect(createdBooking.responses).toEqual(
              expect.objectContaining({
                email: booker.email,
                name: booker.name,
              })
            );

            expect(createdBooking).toEqual(
              expect.objectContaining({
                location: "integrations:daily",
              })
            );

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

          // expectWorkflowToBeTriggered();

          expectSuccessfulBookingCreationEmails({
            booker,
            booking: {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBookings[0].uid!,
              urlOrigin: WEBSITE_URL,
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

      test.skip(
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
                  slotInterval: 30,
                  length: 30,
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

          await mockCalendarToHaveNoBusySlots("googlecalendar", {
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

          await expect(handleRecurringEventBooking(req)).rejects.toThrow(ErrorCode.NoAvailableUsersFound);
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
                  slotInterval: 30,
                  length: 30,
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

          const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
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

          const createdBookings = await handleRecurringEventBooking(req);
          expect(createdBookings.length).toBe(numOfSlotsToBeBooked);
          for (const [index, createdBooking] of Object.entries(createdBookings)) {
            logger.debug("Assertion for Booking with index:", index, { createdBooking });
            expect(createdBooking.responses).toEqual(
              expect.objectContaining({
                email: booker.email,
                name: booker.name,
              })
            );

            expect(createdBooking).toEqual(
              expect.objectContaining({
                location: "integrations:daily",
              })
            );

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

          // expectWorkflowToBeTriggered();

          expectSuccessfulBookingCreationEmails({
            booker,
            booking: {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBookings[0].uid!,
              urlOrigin: WEBSITE_URL,
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
                  slotInterval: 30,
                  length: 30,
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

          const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
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

          const createdBookings = await handleRecurringEventBooking(req);
          expect(createdBookings.length).toBe(numOfSlotsToBeBooked);
          for (const [index, createdBooking] of Object.entries(createdBookings)) {
            logger.debug("Assertion for Booking with index:", index, { createdBooking });
            expect(createdBooking.responses).toEqual(
              expect.objectContaining({
                email: booker.email,
                name: booker.name,
              })
            );

            expect(createdBooking).toEqual(
              expect.objectContaining({
                location: "integrations:daily",
              })
            );

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

          // expectWorkflowToBeTriggered();

          expectSuccessfulBookingCreationEmails({
            booking: {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              uid: createdBookings[0].uid!,
              urlOrigin: WEBSITE_URL,
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
    describe("Round robin event type:", () => {
      test.skip("should when when a fixed host is not available on the second slot", async () => {
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
          // So, that it picks the first schedule from the list
          defaultScheduleId: null,
          teams: [
            {
              membership: {
                accepted: true,
              },
              team: {
                id: 1,
                name: "Team 1",
                slug: "team-1",
              },
            },
          ],
          // Has morning shift with some overlap with morning shift
          schedules: [TestData.schedules.IstMorningShift],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          destinationCalendar: {
            integration: TestData.apps["google-calendar"].type,
            externalId: "organizer@google-calendar.com",
          },
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
            schedules: [TestData.schedules.IstMorningShift],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "other-team-member-1@google-calendar.com",
            },
          },
        ];

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
                slotInterval: 30,
                schedulingType: SchedulingType.ROUND_ROBIN,
                length: 30,
                recurringEvent: recurrence,
                hosts: [
                  {
                    userId: 101,
                    isFixed: false,
                  },
                  {
                    userId: 102,
                    isFixed: true,
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
                userId: 102,
                attendees: [
                  {
                    email: "IntegrationTestUser102@example.com",
                  },
                ],
                eventTypeId: 1,
                status: "ACCEPTED",
                startTime: `${plus2DateString}T04:00:00.000Z`,
                endTime: `${plus2DateString}T04:30:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
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

        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
        });

        const recurringCountInRequest = 4;
        const mockBookingData1 = getMockRequestDataForBooking({
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
            .fill(mockBookingData1)
            .map((mockBookingData, index) => {
              return {
                ...mockBookingData,
                schedulingType: SchedulingType.ROUND_ROBIN,
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
              };
            }),
        });
        let error = { message: "" };
        try {
          await handleRecurringEventBooking(req);
        } catch (e) {
          error = e as Error;
        }
        expect(error.message).toBe(ErrorCode.NoAvailableUsersFound);
      });

      test("should create successfully bookings that are all assigned to the next available least recently booked user", async () => {
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
          // So, that it picks the first schedule from the list
          defaultScheduleId: null,
          teams: [
            {
              membership: {
                accepted: true,
              },
              team: {
                id: 1,
                name: "Team 1",
                slug: "team-1",
              },
            },
          ],
          // Has morning shift with some overlap with morning shift
          schedules: [TestData.schedules.IstMorningShift],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          destinationCalendar: {
            integration: TestData.apps["google-calendar"].type,
            externalId: "organizer@google-calendar.com",
          },
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
            schedules: [TestData.schedules.IstMorningShift],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "other-team-member-1@google-calendar.com",
            },
          },
        ];

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
                slotInterval: 30,
                schedulingType: SchedulingType.ROUND_ROBIN,
                length: 30,
                recurringEvent: recurrence,
                users: [
                  {
                    id: 101,
                  },
                  {
                    id: 102,
                  },
                ],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                },
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
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

        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
        });

        const recurringCountInRequest = 4;
        const mockBookingData1 = getMockRequestDataForBooking({
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

        const mockBookingData2 = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T07:00:00.000Z`,
            end: `${plus1DateString}T07:30:00.000Z`,
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
            .fill(mockBookingData1)
            .map((mockBookingData, index) => {
              return {
                ...mockBookingData,
                schedulingType: SchedulingType.ROUND_ROBIN,
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
              };
            }),
        });

        const { req: req1, res: res1 } = createMockNextJsRequest({
          method: "POST",
          body: Array(numOfSlotsToBeBooked)
            .fill(mockBookingData2)
            .map((mockBookingData, index) => {
              return {
                ...mockBookingData,
                schedulingType: SchedulingType.ROUND_ROBIN,
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
              };
            }),
        });

        const createdBookings1 = await handleRecurringEventBooking(req);

        const assignedUserIds1 = createdBookings1.map((booking) => booking.userId);

        const createdBookings2 = await handleRecurringEventBooking(req1);

        const assignedUserIds2 = createdBookings2.map((booking) => booking.userId);

        const allSameHosts = (assignedUserIds: (number | null | undefined)[]) =>
          assignedUserIds.every((id) => id === assignedUserIds[0]);

        expect(createdBookings1[0].userId).not.toBe(createdBookings2[0].userId);
        expect(allSameHosts(assignedUserIds1)).toBe(true);
        expect(allSameHosts(assignedUserIds2)).toBe(true);
      });

      test(`should create bookings that are all assigned to the least recently booked user that is available on the first two slots,
            if the least recently booked user is not available on the second slot`, async () => {
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
          // So, that it picks the first schedule from the list
          defaultScheduleId: null,
          teams: [
            {
              membership: {
                accepted: true,
              },
              team: {
                id: 1,
                name: "Team 1",
                slug: "team-1",
              },
            },
          ],
          // Has morning shift with some overlap with morning shift
          schedules: [TestData.schedules.IstMorningShift],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          destinationCalendar: {
            integration: TestData.apps["google-calendar"].type,
            externalId: "organizer@google-calendar.com",
          },
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
            schedules: [TestData.schedules.IstMorningShift],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "other-team-member-1@google-calendar.com",
            },
          },
        ];

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
                slotInterval: 30,
                schedulingType: SchedulingType.ROUND_ROBIN,
                length: 30,
                recurringEvent: recurrence,
                users: [
                  {
                    id: 101,
                  },
                  {
                    id: 102,
                  },
                ],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@google-calendar.com",
                },
              },
            ],
            bookings: [
              // Create a booking on our Collective Event Type
              {
                userId: 101,
                attendees: [
                  {
                    email: "IntegrationTestUser102@example.com",
                  },
                ],
                eventTypeId: 1,
                status: "ACCEPTED",
                startTime: `${plus2DateString}T04:00:00.000Z`,
                endTime: `${plus2DateString}T04:30:00.000Z`,
              },
              {
                userId: 101,
                attendees: [
                  {
                    email: "IntegrationTestUser102@example.com",
                  },
                ],
                eventTypeId: 1,
                status: "ACCEPTED",
                startTime: `${plus2DateString}T07:00:00.000Z`,
                endTime: `${plus2DateString}T07:30:00.000Z`,
              },
            ],
            organizer,
            usersApartFromOrganizer: otherTeamMembers,
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

        const calendarMock = await mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
            iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
          },
        });

        const recurringCountInRequest = 4;
        const mockBookingData1 = getMockRequestDataForBooking({
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

        const mockBookingData2 = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus1DateString}T07:00:00.000Z`,
            end: `${plus1DateString}T07:30:00.000Z`,
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
            .fill(mockBookingData1)
            .map((mockBookingData, index) => {
              return {
                ...mockBookingData,
                schedulingType: SchedulingType.ROUND_ROBIN,
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
              };
            }),
        });

        const { req: req1, res: res1 } = createMockNextJsRequest({
          method: "POST",
          body: Array(numOfSlotsToBeBooked)
            .fill(mockBookingData2)
            .map((mockBookingData, index) => {
              return {
                ...mockBookingData,
                schedulingType: SchedulingType.ROUND_ROBIN,
                start: getPlusDayDate(mockBookingData.start, index).toISOString(),
                end: getPlusDayDate(mockBookingData.end, index).toISOString(),
              };
            }),
        });

        const createdBookings1 = await handleRecurringEventBooking(req);

        const assignedUserIds1 = createdBookings1.map((booking) => booking.userId);

        const createdBookings2 = await handleRecurringEventBooking(req1);

        const assignedUserIds2 = createdBookings2.map((booking) => booking.userId);

        const allSameHosts = (assignedUserIds: (number | null | undefined)[]) =>
          assignedUserIds.every((id) => id === assignedUserIds[0]);

        expect(createdBookings1[0].userId).toBe(102); // user 101 is busy on the second recurring slot
        expect(allSameHosts(assignedUserIds1)).toBe(true);
        expect(allSameHosts(assignedUserIds2)).toBe(true);
      });
    });
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
