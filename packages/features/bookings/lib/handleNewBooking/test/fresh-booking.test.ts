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
import { WEBSITE_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { resetTestEmails } from "@calcom/lib/testEmails";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  getAppleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  getZoomAppCredential,
  mockErrorOnVideoMeetingCreation,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  getStripeAppCredential,
  MockError,
  mockPaymentApp,
  mockPaymentSuccessWebhookFromStripe,
  mockCalendar,
  mockCalendarToCrashOnCreateEvent,
  mockVideoAppToCrashOnCreateMeeting,
  BookingLocations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import {
  expectWorkflowToBeTriggered,
  expectWorkflowToBeNotTriggered,
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectAwaitingPaymentEmails,
  expectBookingRequestedEmails,
  expectBookingRequestedWebhookToHaveBeenFired,
  expectBookingCreatedWebhookToHaveBeenFired,
  expectBookingPaymentIntiatedWebhookToHaveBeenFired,
  expectBrokenIntegrationEmails,
  expectSuccessfulCalendarEventCreationInCalendar,
  expectICalUIDAsString,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";
import { testWithAndWithoutOrg } from "@calcom/web/test/utils/bookingScenario/test";

export type CustomNextApiRequest = NextApiRequest & Request;

export type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;

describe("handleNewBooking", () => {
  setupAndTeardown();

  describe("Fresh/New Booking:", () => {
    testWithAndWithoutOrg(
      `should create a successful booking with Cal Video(Daily Video) if no explicit location is provided
          1. Should create a booking in the database
          2. Should send emails to the booker as well as organizer
          3. Should create a booking in the event's destination calendar
          4. Should trigger BOOKING_CREATED webhook
    `,
      async ({ emails, org }) => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const organizerOtherEmail = "organizer2@example.com";
        const organizerDestinationCalendarEmailOnEventType = "organizerEventTypeEmail@example.com";

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
          getScenarioData(
            {
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
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeEventTypeId: 1,
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  length: 30,
                  useEventTypeDestinationCalendarEmail: true,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  destinationCalendar: {
                    integration: "google_calendar",
                    externalId: "event-type-1@google-calendar.com",
                    primaryEmail: organizerDestinationCalendarEmailOnEventType,
                  },
                },
              ],
              organizer,
              apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
            },
            org?.organization
          )
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
          },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
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
              uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
              meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
              meetingPassword: "MOCK_PASSWORD",
              meetingUrl: "https://UNUSED_URL",
            },
          ],
          iCalUID: createdBooking.iCalUID,
        });

        expectWorkflowToBeTriggered({
          emailsToReceive: [organizerDestinationCalendarEmailOnEventType],
          emails,
        });
        expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
          calendarId: "event-type-1@google-calendar.com",
          videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
        });

        const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

        expectSuccessfulBookingCreationEmails({
          booking: {
            uid: createdBooking.uid!,
            urlOrigin: org ? org.urlOrigin : WEBSITE_URL,
          },
          booker,
          organizer,
          emails,
          iCalUID,
          destinationEmail: organizerDestinationCalendarEmailOnEventType,
        });

        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: BookingLocations.CalVideo,
          subscriberUrl: "http://my-webhook.example.com",
          videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
        });
      },
      timeout
    );

    describe("Calendar events should be created in the appropriate calendar", () => {
      test(
        `should create a successful booking in the first connected calendar i.e. using the first credential(in the scenario when there is no event-type or organizer destination calendar)
          1. Should create a booking in the database
          2. Should send emails to the booker as well as organizer
          3. Should fallback to creating the booking in the first connected Calendar when neither event nor organizer has a destination calendar - This doesn't practically happen because organizer is always required to have a schedule set
          3. Should trigger BOOKING_CREATED webhook
    `,
        async ({ emails }) => {
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
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
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
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeEventTypeId: 1,
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

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
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
          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        `should create a successful booking in the organizer calendar(in the scenario when event type doesn't have destination calendar)
          1. Should create a booking in the database
          2. Should send emails to the booker as well as organizer
          3. Should fallback to create a booking in the Organizer Calendar if event doesn't have destination calendar
          3. Should trigger BOOKING_CREATED webhook
    `,
        async ({ emails }) => {
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
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
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
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeEventTypeId: 1,
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
              uid: "MOCK_ID",
              id: "GOOGLE_CALENDAR_EVENT_ID",
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

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
            calendarId: "organizer@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
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

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        `an error in creating a calendar event should not stop the booking creation - Current behaviour is wrong as the booking is created but no-one is notified of it`,
        async ({ emails }) => {
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
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
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
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeEventTypeId: 1,
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
            })
          );

          const _calendarMock = mockCalendarToCrashOnCreateEvent("googlecalendar");

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
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
            location: "New York",
          });

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
            references: [
              {
                type: appStoreMetadata.googlecalendar.type,
                // A reference is still created in case of event creation failure, with nullish values. Not sure what's the purpose for this.
                uid: "",
                meetingId: null,
                meetingPassword: null,
                meetingUrl: null,
              },
            ],
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          // FIXME: We should send Broken Integration emails on calendar event creation failure
          // expectCalendarEventCreationFailureEmails({ booker, organizer, emails });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "New York",
            subscriberUrl: "http://my-webhook.example.com",
          });
        },
        timeout
      );

      test(
        "If destination calendar has no credential ID due to some reason, it should create the event in first connected calendar instead",
        async ({ emails }) => {
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
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
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
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeEventTypeId: 1,
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
            })
          );

          // await prismaMock.destinationCalendar.update({
          //   where: {
          //     userId: organizer.id,
          //   },
          //   data: {
          //     credentialId: null,
          //   },
          // });
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
              uid: "MOCK_ID",
              id: "GOOGLE_CALENDAR_EVENT_ID",
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

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
            calendarId: "organizer@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
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

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        "If destination calendar is there for Google Calendar but there are no Google Calendar credentials but there is an Apple Calendar credential connected, it should create the event in Apple Calendar",
        async ({ emails }) => {
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
            credentials: [getAppleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: "google_calendar",
              externalId: "organizer@google-calendar.com",
            },
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
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeEventTypeId: 1,
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

          const calendarMock = mockCalendarToHaveNoBusySlots("applecalendar", {
            create: {
              uid: "MOCK_ID",
              id: "MOCKED_APPLE_CALENDAR_EVENT_ID",
              iCalUID: "MOCKED_APPLE_CALENDAR_ICS_ID",
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
                type: appStoreMetadata.applecalendar.type,
                uid: "MOCKED_APPLE_CALENDAR_EVENT_ID",
                meetingId: "MOCKED_APPLE_CALENDAR_EVENT_ID",
                meetingPassword: "MOCK_PASSWORD",
                meetingUrl: "https://UNUSED_URL",
              },
            ],
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });
          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
            calendarId: "organizer@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
          });

          expectSuccessfulBookingCreationEmails({
            booking: {
              uid: createdBooking.uid!,
            },
            booker,
            organizer,
            emails,
            iCalUID: "MOCKED_APPLE_CALENDAR_ICS_ID",
          });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );
    });

    describe("Video Meeting Creation", () => {
      test(
        `should create a successful booking with Zoom if used`,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getZoomAppCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          });
          await createBookingScenario(
            getScenarioData({
              organizer,
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
              apps: [TestData.apps["zoomvideo"]],
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl,
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
            })
          );
          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "zoomvideo",
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: BookingLocations.ZoomVideo },
                },
              },
            }),
          });
          const createdBooking = await handleNewBooking(req);

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

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.ZoomVideo,
            subscriberUrl,
            videoCallUrl: "http://mock-zoomvideo.example.com",
          });
        },
        timeout
      );

      test(
        `Booking should still be created if booking with Zoom errors`,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getZoomAppCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          });
          await createBookingScenario(
            getScenarioData({
              organizer,
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
              apps: [TestData.apps["zoomvideo"]],
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl,
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
            })
          );

          mockVideoAppToCrashOnCreateMeeting({
            metadataLookupKey: "zoomvideo",
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: getMockRequestDataForBooking({
              data: {
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: BookingLocations.ZoomVideo },
                },
              },
            }),
          });
          await handleNewBooking(req);

          expectBrokenIntegrationEmails({ organizer, emails });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.ZoomVideo,
            subscriberUrl,
            videoCallUrl: null,
          });
        },
        timeout
      );
    });

    describe("Event length check during booking", () => {
      test(
        `should fail if the time difference between a booking's start and end times is not equal to the event length.`,
        async () => {
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

          await createBookingScenario(
            getScenarioData({
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
            })
          );

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
              end: `${getDate({ dateIncrement: 1 }).dateString}T05:15:00.000Z`,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "New York" },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          await expect(async () => await handleNewBooking(req)).rejects.toThrowError("Invalid event length");
        },
        timeout
      );
    });

    describe(
      "Availability Check during booking",
      () => {
        test(
          `should fail a booking if there is already a Cal.com booking overlapping the time`,
          async ({}) => {
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
              // credentials: [getGoogleCalendarCredential()],
              // selectedCalendars: [TestData.selectedCalendars.google],
            });

            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
            const uidOfOverlappingBooking = "harWv3eHgconAED2j4gcVhP";
            await createBookingScenario(
              getScenarioData({
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
                bookings: [
                  {
                    uid: uidOfOverlappingBooking,
                    eventTypeId: 1,
                    userId: 101,
                    status: BookingStatus.ACCEPTED,
                    startTime: `${plus1DateString}T05:00:00.000Z`,
                    endTime: `${plus1DateString}T05:30:00.000Z`,
                  },
                ],
                organizer,
              })
            );

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
                end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: "New York" },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            await expect(async () => await handleNewBooking(req)).rejects.toThrowError(
              ErrorCode.NoAvailableUsersFound
            );
          },
          timeout
        );

        test(
          `should fail a booking if there is already a booking in the organizer's selectedCalendars(Single Calendar) with the overlapping time`,
          async () => {
            const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
            const organizerId = 101;
            const booker = getBooker({
              email: "booker@example.com",
              name: "Booker",
            });

            const organizer = getOrganizer({
              name: "Organizer",
              email: "organizer@example.com",
              id: organizerId,
              schedules: [TestData.schedules.IstWorkHours],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
            });
            const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

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
                    users: [
                      {
                        id: 101,
                      },
                    ],
                  },
                ],
                organizer,
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

            const mockBookingData = getMockRequestDataForBooking({
              data: {
                start: `${getDate({ dateIncrement: 1 }).dateString}T05:00:00.000Z`,
                end: `${getDate({ dateIncrement: 1 }).dateString}T05:30:00.000Z`,
                eventTypeId: 1,
                responses: {
                  email: booker.email,
                  name: booker.name,
                  location: { optionValue: "", value: "New York" },
                },
              },
            });

            const { req } = createMockNextJsRequest({
              method: "POST",
              body: mockBookingData,
            });

            await expect(async () => await handleNewBooking(req)).rejects.toThrowError(
              ErrorCode.NoAvailableUsersFound
            );
          },
          timeout
        );
      },
      timeout
    );

    describe("Event Type that requires confirmation", () => {
      test(
        `should create a booking request for event that requires confirmation
            1. Should create a booking in the database with status PENDING
            2. Should send emails to the booker as well as organizer for booking request and awaiting approval
            3. Should trigger BOOKING_REQUESTED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
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
          const scenarioData = getScenarioData({
            webhooks: [
              {
                userId: organizer.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl,
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeEventTypeId: 1,
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                requiresConfirmation: true,
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
          await createBookingScenario(scenarioData);

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });

          mockCalendarToHaveNoBusySlots("googlecalendar", {
            create: {
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
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
            status: BookingStatus.PENDING,
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectBookingRequestedEmails({
            booker,
            organizer,
            emails,
          });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );

      /**
       * NOTE: We might want to think about making the bookings get ACCEPTED automatically if the booker is the organizer of the event-type. This is a design decision it seems for now.
       */
      test(
        `should make a fresh booking in PENDING state even when the booker is the organizer of the event-type
        1. Should create a booking in the database with status PENDING
        2. Should send emails to the booker as well as organizer for booking request and awaiting approval
        3. Should trigger BOOKING_REQUESTED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
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
          const scenarioData = getScenarioData({
            webhooks: [
              {
                userId: organizer.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl,
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeEventTypeId: 1,
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                requiresConfirmation: true,
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
          await createBookingScenario(scenarioData);

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });

          mockCalendarToHaveNoBusySlots("googlecalendar", {
            create: {
              iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID",
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
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });

          req.userId = organizer.id;

          const createdBooking = await handleNewBooking(req);

          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
            location: BookingLocations.CalVideo,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectBookingRequestedEmails({
            booker,
            organizer,
            emails,
          });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );

      test(
        `should create a booking for event that requires confirmation based on a booking notice duration threshold, if threshold is not met
            1. Should create a booking in the database with status ACCEPTED
            2. Should send emails to the booker as well as organizer
            3. Should trigger BOOKING_CREATED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });
          const subscriberUrl = "http://my-webhook.example.com";

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          });

          await createBookingScenario(
            getScenarioData({
              webhooks: [
                {
                  userId: organizer.id,
                  eventTriggers: ["BOOKING_CREATED"],
                  subscriberUrl,
                  active: true,
                  eventTypeId: 1,
                  appId: null,
                },
              ],
              workflows: [
                {
                  userId: organizer.id,
                  trigger: "NEW_EVENT",
                  action: "EMAIL_HOST",
                  template: "REMINDER",
                  activeEventTypeId: 1,
                },
              ],
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 30,
                  requiresConfirmation: true,
                  metadata: {
                    requiresConfirmationThreshold: {
                      time: 30,
                      unit: "minutes",
                    },
                  },
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
            })
          );

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });

          mockCalendarToHaveNoBusySlots("googlecalendar", {});

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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
            iCalUID: createdBooking.iCalUID,
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
          });
        },
        timeout
      );

      test(
        `should create a booking for event that requires confirmation based on a booking notice duration threshold, if threshold IS MET
            1. Should create a booking in the database with status PENDING
            2. Should send emails to the booker as well as organizer for booking request and awaiting approval
            3. Should trigger BOOKING_REQUESTED webhook
    `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
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
          const scenarioData = getScenarioData({
            webhooks: [
              {
                userId: organizer.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl,
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeEventTypeId: 1,
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                requiresConfirmation: true,
                metadata: {
                  requiresConfirmationThreshold: {
                    time: 120,
                    unit: "hours",
                  },
                },
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

          await createBookingScenario(scenarioData);

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });

          mockCalendarToHaveNoBusySlots("googlecalendar", {});

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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
            status: BookingStatus.PENDING,
            iCalUID: createdBooking.iCalUID,
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectBookingRequestedEmails({ booker, organizer, emails });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );
    });

    // FIXME: We shouldn't throw error here, the behaviour should be fixed.
    test(
      `if booking with Cal Video(Daily Video) fails, booking creation fails with uncaught error`,
      async ({}) => {
        const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
        const booker = getBooker({
          email: "booker@example.org",
          name: "Booker",
        });
        const organizer = TestData.users.example;

        await createBookingScenario({
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
          users: [
            {
              ...organizer,
              id: 101,
              schedules: [TestData.schedules.IstWorkHours],
              credentials: [getGoogleCalendarCredential()],
              selectedCalendars: [TestData.selectedCalendars.google],
            },
          ],
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        });

        mockErrorOnVideoMeetingCreation({
          metadataLookupKey: "dailyvideo",
        });

        mockCalendarToHaveNoBusySlots("googlecalendar");

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          }),
        });

        try {
          await handleNewBooking(req);
        } catch (e) {
          expect(e).toBeInstanceOf(MockError);
          expect((e as { message: string }).message).toBe("Error creating Video meeting");
        }
      },
      timeout
    );

    test(
      `should create a successful booking when location is provided as label of an option(Done for Organizer Address)
      1. Should create a booking in the database
      2. Should send emails to the booker as well as organizer
      3. Should trigger BOOKING_CREATED webhook
    `,
      async ({ emails }) => {
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
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            user: organizer.username,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "New York" },
            },
          },
        });

        const { req } = createMockNextJsRequest({
          method: "POST",
          body: mockBookingData,
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
          workflows: [
            {
              userId: organizer.id,
              trigger: "NEW_EVENT",
              action: "EMAIL_HOST",
              template: "REMINDER",
              activeEventTypeId: 1,
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

        const createdBooking = await handleNewBooking(req);
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
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
          iCalUID: createdBooking.iCalUID,
        });

        expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

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
        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: "New York",
          subscriberUrl: "http://my-webhook.example.com",
        });
      },
      timeout
    );

    describe("Paid Events", () => {
      test(
        `Event Type that doesn't require confirmation
            1. Should create a booking in the database with status PENDING
            2. Should send email to the booker for Payment request
            3. Should trigger BOOKING_PAYMENT_INITIATED webhook
            4. Once payment is successful, should trigger BOOKING_CREATED webhook
            5. Workflow should not trigger before payment is made
            6. Workflow triggers once payment is successful
      `,
        async ({ emails }) => {
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
            credentials: [getGoogleCalendarCredential(), getStripeAppCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
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
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeEventTypeId: 1,
              },
            ],
            eventTypes: [
              {
                id: 1,
                title: "Paid Event",
                description: "It's a test Paid Event",
                slotInterval: 30,
                requiresConfirmation: false,
                metadata: {
                  apps: {
                    // EventType is connected to stripe.
                    stripe: {
                      price: 100,
                      enabled: true,
                      currency: "inr" /*, credentialId: 57*/,
                    },
                  },
                },
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
            apps: [
              TestData.apps["google-calendar"],
              TestData.apps["daily-video"],
              TestData.apps["stripe-payment"],
            ],
          });
          await createBookingScenario(scenarioData);
          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });
          const { paymentUid, externalId } = mockPaymentApp({
            metadataLookupKey: "stripe",
            appStoreLookupKey: "stripepayment",
          });
          mockCalendarToHaveNoBusySlots("googlecalendar");
          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
            },
          });

          const { req } = createMockNextJsRequest({
            method: "POST",
            body: mockBookingData,
          });
          const createdBooking = await handleNewBooking(req);

          expect(createdBooking).toContain({
            location: BookingLocations.CalVideo,
            paymentUid: paymentUid,
          });

          await expectBookingToBeInDatabase({
            description: "",
            location: BookingLocations.CalVideo,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectAwaitingPaymentEmails({ organizer, booker, emails });

          expectBookingPaymentIntiatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            paymentId: createdBooking.paymentId!,
          });

          const { webhookResponse } = await mockPaymentSuccessWebhookFromStripe({ externalId });

          expect(webhookResponse?.statusCode).toBe(200);
          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
          });

          expectWorkflowToBeTriggered({ emailsToReceive: [organizer.email], emails });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/${createdBooking.uid}`,
            paidEvent: true,
          });
        },
        timeout
      );
      // TODO: We should introduce a new state BOOKING.PAYMENT_PENDING that can clearly differentiate b/w pending confirmation(stuck on Organizer) and pending payment(stuck on booker)
      test(
        `Event Type that requires confirmation
            1. Should create a booking in the database with status PENDING
            2. Should send email to the booker for Payment request
            3. Should trigger BOOKING_PAYMENT_INITIATED webhook
            4. Once payment is successful, should trigger BOOKING_REQUESTED webhook
            5. Booking should still stay in pending state
      `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const subscriberUrl = "http://my-webhook.example.com";
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizer = getOrganizer({
            name: "Organizer",
            email: "organizer@example.com",
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential(), getStripeAppCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          });

          const scenarioData = getScenarioData({
            webhooks: [
              {
                userId: organizer.id,
                eventTriggers: ["BOOKING_CREATED"],
                subscriberUrl,
                active: true,
                eventTypeId: 1,
                appId: null,
              },
            ],
            workflows: [
              {
                userId: organizer.id,
                trigger: "NEW_EVENT",
                action: "EMAIL_HOST",
                template: "REMINDER",
                activeEventTypeId: 1,
              },
            ],
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                requiresConfirmation: true,
                metadata: {
                  apps: {
                    stripe: {
                      price: 100,
                      enabled: true,
                      currency: "inr" /*, credentialId: 57*/,
                    },
                  },
                },
                length: 30,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            organizer,
            apps: [
              TestData.apps["google-calendar"],
              TestData.apps["daily-video"],
              TestData.apps["stripe-payment"],
            ],
          });
          await createBookingScenario(scenarioData);
          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });
          const { paymentUid, externalId } = mockPaymentApp({
            metadataLookupKey: "stripe",
            appStoreLookupKey: "stripepayment",
          });
          mockCalendarToHaveNoBusySlots("googlecalendar");

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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
            paymentUid: paymentUid,
          });
          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
          });

          expectWorkflowToBeNotTriggered({ emailsToReceive: [organizer.email], emails });

          expectAwaitingPaymentEmails({ organizer, booker, emails });
          expectBookingPaymentIntiatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl: "http://my-webhook.example.com",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            paymentId: createdBooking.paymentId!,
          });

          // FIXME: Right now we need to reset the test Emails because email expects only tests first email content for an email address
          // Reset Test Emails to test for more Emails
          resetTestEmails();
          const { webhookResponse } = await mockPaymentSuccessWebhookFromStripe({ externalId });

          expect(webhookResponse?.statusCode).toBe(200);
          await expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
          });

          expectBookingRequestedEmails({
            booker,
            organizer,
            emails,
          });
          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: BookingLocations.CalVideo,
            subscriberUrl,
            paidEvent: true,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );
      test(
        `cannot book same slot multiple times `,
        async ({ emails }) => {
          const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
          const booker = getBooker({
            email: "booker@example.com",
            name: "Booker",
          });

          const organizerOtherEmail = "organizer2@example.com";
          const organizerDestinationCalendarEmailOnEventType = "organizerEventTypeEmail@example.com";

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
                  length: 30,
                  useEventTypeDestinationCalendarEmail: true,
                  users: [
                    {
                      id: 101,
                    },
                  ],
                  destinationCalendar: {
                    integration: "google_calendar",
                    externalId: "event-type-1@google-calendar.com",
                    primaryEmail: organizerDestinationCalendarEmailOnEventType,
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
            },
          });

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              user: organizer.username,
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: BookingLocations.CalVideo },
              },
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
                uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingId: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
                meetingPassword: "MOCK_PASSWORD",
                meetingUrl: "https://UNUSED_URL",
              },
            ],
            iCalUID: createdBooking.iCalUID,
          });

          expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
            calendarId: "event-type-1@google-calendar.com",
            videoCallUrl: "http://mock-dailyvideo.example.com/meeting-1",
          });

          const iCalUID = expectICalUIDAsString(createdBooking.iCalUID);

          expectSuccessfulBookingCreationEmails({
            booking: {
              uid: createdBooking.uid!,
              urlOrigin: WEBSITE_URL,
            },
            booker,
            organizer,
            emails,
            iCalUID,
            destinationEmail: organizerDestinationCalendarEmailOnEventType,
          });

          await expect(async () => await handleNewBooking(req)).rejects.toThrowError(
            ErrorCode.NoAvailableUsersFound
          );
        },
        timeout
      );
    });
  });

  test.todo("CRM calendar events creation verification");
});
