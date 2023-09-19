/**
 * How to ensure that unmocked prisma queries aren't called?
 */
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, beforeEach } from "vitest";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { BookingStatus } from "@calcom/prisma/enums";
import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  getZoomAppCredential,
  mockEnableEmailFeature,
  mockNoTranslations,
  mockErrorOnVideoMeetingCreation,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  getStripeAppCredential,
  MockError,
  mockPaymentApp,
  mockPaymentSuccessWebhookFromStripe,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectWorkflowToBeTriggered,
  expectSuccessfulBookingCreationEmails,
  expectBookingToBeInDatabase,
  expectAwaitingPaymentEmails,
  expectBookingRequestedEmails,
  expectBookingRequestedWebhookToHaveBeenFired,
  expectBookingCreatedWebhookToHaveBeenFired,
  expectBookingPaymentIntiatedWebhookToHaveBeenFired,
} from "@calcom/web/test/utils/bookingScenario/expects";

type CustomNextApiRequest = NextApiRequest & Request;

type CustomNextApiResponse = NextApiResponse & Response;
// Local test runs sometime gets too slow
const timeout = process.env.CI ? 5000 : 20000;
describe("handleNewBooking", () => {
  beforeEach(() => {
    // Required to able to generate token in email in some cases
    process.env.CALENDSO_ENCRYPTION_KEY = "abcdefghjnmkljhjklmnhjklkmnbhjui";
    process.env.STRIPE_WEBHOOK_SECRET = "MOCK_STRIPE_WEBHOOK_SECRET";
    mockNoTranslations();
    mockEnableEmailFeature();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  describe("Frontend:", () => {
    test(
      `should create a successful booking with Cal Video(Daily Video) if no explicit location is provided
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

        createBookingScenario(
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

        mockCalendarToHaveNoBusySlots("googlecalendar");

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: "integrations:daily" },
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
          location: "integrations:daily",
        });

        expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: createdBooking.id!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
        });

        expectWorkflowToBeTriggered();

        expectSuccessfulBookingCreationEmails({ booker, organizer, emails });
        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: "integrations:daily",
          subscriberUrl: "http://my-webhook.example.com",
          videoCallUrl: `${WEBAPP_URL}/video/DYNAMIC_UID`,
        });
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
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                requiresConfirmation: true,
                length: 45,
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
          createBookingScenario(scenarioData);

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });

          mockCalendarToHaveNoBusySlots("googlecalendar");

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "integrations:daily" },
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
            location: "integrations:daily",
          });

          expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: createdBooking.id!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
          });

          expectWorkflowToBeTriggered();

          expectBookingRequestedEmails({
            booker,
            organizer,
            emails,
          });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
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

          createBookingScenario(
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
              eventTypes: [
                {
                  id: 1,
                  slotInterval: 45,
                  requiresConfirmation: true,
                  metadata: {
                    requiresConfirmationThreshold: {
                      time: 30,
                      unit: "minutes",
                    },
                  },
                  length: 45,
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

          mockCalendarToHaveNoBusySlots("googlecalendar");

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "integrations:daily" },
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
            location: "integrations:daily",
          });

          expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: createdBooking.id!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
          });

          expectWorkflowToBeTriggered();

          expectSuccessfulBookingCreationEmails({ booker, organizer, emails });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
            subscriberUrl,
            videoCallUrl: `${WEBAPP_URL}/video/DYNAMIC_UID`,
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
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                requiresConfirmation: true,
                metadata: {
                  requiresConfirmationThreshold: {
                    time: 120,
                    unit: "hours",
                  },
                },
                length: 45,
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

          createBookingScenario(scenarioData);

          mockSuccessfulVideoMeetingCreation({
            metadataLookupKey: "dailyvideo",
          });

          mockCalendarToHaveNoBusySlots("googlecalendar");

          const mockBookingData = getMockRequestDataForBooking({
            data: {
              eventTypeId: 1,
              responses: {
                email: booker.email,
                name: booker.name,
                location: { optionValue: "", value: "integrations:daily" },
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
            location: "integrations:daily",
          });

          expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: createdBooking.id!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
          });

          expectWorkflowToBeTriggered();

          expectBookingRequestedEmails({ booker, organizer, emails });

          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
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

        createBookingScenario({
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
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
                location: { optionValue: "", value: "integrations:daily" },
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
        createBookingScenario(
          getScenarioData({
            organizer,
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                length: 45,
                users: [
                  {
                    id: 101,
                  },
                ],
              },
            ],
            apps: [TestData.apps["daily-video"]],
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
                location: { optionValue: "", value: "integrations:zoom" },
              },
            },
          }),
        });
        await handleNewBooking(req);

        expectSuccessfulBookingCreationEmails({ booker, organizer, emails });

        expectBookingCreatedWebhookToHaveBeenFired({
          booker,
          organizer,
          location: "integrations:zoom",
          subscriberUrl,
          videoCallUrl: "http://mock-zoomvideo.example.com",
        });
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
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
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

        mockCalendarToHaveNoBusySlots("googlecalendar");
        createBookingScenario(scenarioData);

        const createdBooking = await handleNewBooking(req);
        expect(createdBooking.responses).toContain({
          email: booker.email,
          name: booker.name,
        });

        expect(createdBooking).toContain({
          location: "New York",
        });

        expectBookingToBeInDatabase({
          description: "",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: createdBooking.id!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
        });

        expectWorkflowToBeTriggered();

        expectSuccessfulBookingCreationEmails({ booker, organizer, emails });
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
            eventTypes: [
              {
                id: 1,
                title: "Paid Event",
                description: "It's a test Paid Event",
                slotInterval: 45,
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
                length: 45,
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
          createBookingScenario(scenarioData);
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
                location: { optionValue: "", value: "integrations:daily" },
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
            location: "integrations:daily",
            paymentUid: paymentUid,
          });
          expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: createdBooking.id!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
          });
          expectWorkflowToBeTriggered();
          expectAwaitingPaymentEmails({ organizer, booker, emails });

          expectBookingPaymentIntiatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
            subscriberUrl: "http://my-webhook.example.com",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            paymentId: createdBooking.paymentId!,
          });

          const { webhookResponse } = await mockPaymentSuccessWebhookFromStripe({ externalId });

          expect(webhookResponse?.statusCode).toBe(200);
          expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: createdBooking.id!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.ACCEPTED,
          });

          expectBookingCreatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
            subscriberUrl: "http://my-webhook.example.com",
            videoCallUrl: `${WEBAPP_URL}/video/DYNAMIC_UID`,
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
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
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
                length: 45,
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
          createBookingScenario(scenarioData);
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
                location: { optionValue: "", value: "integrations:daily" },
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
            location: "integrations:daily",
            paymentUid: paymentUid,
          });
          expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: createdBooking.id!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
          });
          expectWorkflowToBeTriggered();
          expectAwaitingPaymentEmails({ organizer, booker, emails });
          expectBookingPaymentIntiatedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
            subscriberUrl: "http://my-webhook.example.com",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            paymentId: createdBooking.paymentId!,
          });

          const { webhookResponse } = await mockPaymentSuccessWebhookFromStripe({ externalId });

          expect(webhookResponse?.statusCode).toBe(200);
          expectBookingToBeInDatabase({
            description: "",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            id: createdBooking.id!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
          });
          expectBookingRequestedWebhookToHaveBeenFired({
            booker,
            organizer,
            location: "integrations:daily",
            subscriberUrl,
            paidEvent: true,
            eventType: scenarioData.eventTypes[0],
          });
        },
        timeout
      );
    });
  });
});

function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}

function getBasicMockRequestDataForBooking() {
  return {
    start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
    end: `${getDate({ dateIncrement: 1 }).dateString}T04:30:00.000Z`,
    eventTypeSlug: "no-confirmation",
    timeZone: "Asia/Calcutta",
    language: "en",
    bookingUid: "bvCmP5rSquAazGSA7hz7ZP",
    user: "teampro",
    metadata: {},
    hasHashedBookingLink: false,
    hashedLink: null,
  };
}

function getMockRequestDataForBooking({
  data,
}: {
  data: Partial<ReturnType<typeof getBasicMockRequestDataForBooking>> & {
    eventTypeId: number;
    responses: {
      email: string;
      name: string;
      location: { optionValue: ""; value: string };
    };
  };
}) {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}
