/**
 * Integration tests verifying that the booking flow correctly invokes the webhook producer
 * for BOOKING_REQUESTED scenarios.
 *
 * These tests exercise the full handleNewBooking path (event type creation → booking → webhook producer invocation)
 * and assert that deps.webhookProducer.queueBookingRequestedWebhook is called (or not called) with correct params.
 *
 * This pattern is extendable: as more webhook triggers are migrated to the producer/consumer architecture,
 * new test files can follow this same structure — mock the producer, run the booking flow, assert on the mock.
 */
import {
  expectWebhookProducerCalled,
  expectWebhookProducerNotCalled,
  type MockWebhookProducer,
  resetMockWebhookProducer,
} from "@calcom/testing/lib/webhookProducer";

const mockWebhookProducer: MockWebhookProducer = vi.hoisted(() => ({
  queueBookingCreatedWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingCancelledWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingRescheduledWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingRequestedWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingRejectedWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingPaymentInitiatedWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingPaidWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingNoShowUpdatedWebhook: vi.fn().mockResolvedValue(undefined),
  queueFormSubmittedWebhook: vi.fn().mockResolvedValue(undefined),
  queueRecordingReadyWebhook: vi.fn().mockResolvedValue(undefined),
  queueOOOCreatedWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/webhooks/lib/service/WebhookTaskerProducerService", () => {
  const MockProducer = class {
    queueBookingCreatedWebhook = mockWebhookProducer.queueBookingCreatedWebhook;
    queueBookingCancelledWebhook = mockWebhookProducer.queueBookingCancelledWebhook;
    queueBookingRescheduledWebhook = mockWebhookProducer.queueBookingRescheduledWebhook;
    queueBookingRequestedWebhook = mockWebhookProducer.queueBookingRequestedWebhook;
    queueBookingRejectedWebhook = mockWebhookProducer.queueBookingRejectedWebhook;
    queueBookingPaymentInitiatedWebhook = mockWebhookProducer.queueBookingPaymentInitiatedWebhook;
    queueBookingPaidWebhook = mockWebhookProducer.queueBookingPaidWebhook;
    queueBookingNoShowUpdatedWebhook = mockWebhookProducer.queueBookingNoShowUpdatedWebhook;
    queueFormSubmittedWebhook = mockWebhookProducer.queueFormSubmittedWebhook;
    queueRecordingReadyWebhook = mockWebhookProducer.queueRecordingReadyWebhook;
    queueOOOCreatedWebhook = mockWebhookProducer.queueOOOCreatedWebhook;
  };
  return { WebhookTaskerProducerService: MockProducer };
});

import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getMockBookingReference,
  getOrganizer,
  getScenarioData,
  getStripeAppCredential,
  mockCalendarToHaveNoBusySlots,
  mockPaymentApp,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { handleStripePaymentSuccess } from "@calcom/features/ee/payments/api/webhook";
import type { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { resetTestEmails } from "@calcom/lib/testEmails";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import {
  expectBookingInDBToBeRescheduledFromTo,
  expectBookingRequestedEmails,
  expectBookingToBeInDatabase,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { beforeEach, describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

export type CustomNextApiRequest = NextApiRequest & Request;
export type CustomNextApiResponse = NextApiResponse & Response;

const log = logger.getSubLogger({ prefix: ["[webhook-producer-booking-requested.test]"] });
const timeout = process.env.CI ? 5000 : 20000;

function getMockedStripePaymentEvent({ paymentIntentId }: { paymentIntentId: string }) {
  return {
    id: null,
    data: {
      object: {
        id: paymentIntentId,
      },
    },
  } as unknown as Stripe.Event;
}

async function mockPaymentSuccessWebhookFromStripe({ externalId }: { externalId: string }) {
  let webhookResponse = null;
  try {
    const traceContext = distributedTracing.createTrace("test_stripe_webhook");
    await handleStripePaymentSuccess(
      getMockedStripePaymentEvent({ paymentIntentId: externalId }),
      traceContext
    );
  } catch (e) {
    log.silly("mockPaymentSuccessWebhookFromStripe:catch", JSON.stringify(e));
    webhookResponse = e as HttpError;
  }
  return { webhookResponse };
}

describe("Webhook Producer – BOOKING_REQUESTED", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetMockWebhookProducer(mockWebhookProducer);
  });

  describe("Fresh booking with confirmation required", () => {
    test(
      "should call queueBookingRequestedWebhook when event type requires confirmation",
      async ({ emails }) => {
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
                requiresConfirmation: true,
                length: 30,
                users: [{ id: 101 }],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
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

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData });

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingRequestedWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        });

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingCreatedWebhook");
        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingRescheduledWebhook");

        expectBookingRequestedEmails({ booker, organizer, emails });
      },
      timeout
    );

    test(
      "should call queueBookingRequestedWebhook even when booker is the organizer",
      async ({ emails }) => {
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
                requiresConfirmation: true,
                length: 30,
                users: [{ id: 101 }],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
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

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
          userId: organizer.id,
        });

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingRequestedWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        });

        expectBookingRequestedEmails({ booker, organizer, emails });
      },
      timeout
    );
  });

  describe("Confirmation threshold", () => {
    test(
      "should NOT call queueBookingRequestedWebhook when confirmation threshold is not met",
      async () => {
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
                requiresConfirmation: true,
                metadata: {
                  requiresConfirmationThreshold: {
                    time: 30,
                    unit: "minutes",
                  },
                },
                length: 30,
                users: [{ id: 101 }],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
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

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData });

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
        });

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingRequestedWebhook");
      },
      timeout
    );

    test(
      "should call queueBookingRequestedWebhook when confirmation threshold IS met",
      async ({ emails }) => {
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

        const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

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
                requiresConfirmation: true,
                metadata: {
                  requiresConfirmationThreshold: {
                    time: 120,
                    unit: "hours",
                  },
                },
                length: 30,
                users: [{ id: 101 }],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
        mockCalendarToHaveNoBusySlots("googlecalendar", {});

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            start: `${plus3DateString}T05:00:00.000Z`,
            end: `${plus3DateString}T05:30:00.000Z`,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData });

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingRequestedWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        });

        expectBookingRequestedEmails({ booker, organizer, emails });
      },
      timeout
    );
  });

  describe("Paid event with confirmation required", () => {
    test(
      "should call queueBookingRequestedWebhook after payment succeeds for paid event requiring confirmation",
      async ({ emails }) => {
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
          credentials: [getGoogleCalendarCredential(), getStripeAppCredential()],
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
                      currency: "inr",
                    },
                  },
                },
                length: 30,
                users: [{ id: 101 }],
              },
            ],
            organizer,
            apps: [
              TestData.apps["google-calendar"],
              TestData.apps["daily-video"],
              TestData.apps["stripe-payment"],
            ],
          })
        );

        mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
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

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData });

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.CalVideo,
            paymentUid,
          })
        );

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingRequestedWebhook");

        resetTestEmails();
        resetMockWebhookProducer(mockWebhookProducer);
        const { webhookResponse } = await mockPaymentSuccessWebhookFromStripe({ externalId });

        expect(webhookResponse?.statusCode).toBe(200);
        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingRequestedWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        });

        expectBookingRequestedEmails({ booker, organizer, emails });
      },
      timeout
    );
  });

  describe("Reschedule with confirmation required", () => {
    test(
      "should call queueBookingRequestedWebhook when non-organizer reschedules a booking requiring confirmation",
      async ({ emails }) => {
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

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";

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
                slotInterval: 15,
                requiresConfirmation: true,
                length: 15,
                users: [{ id: 101 }],
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T05:00:00.000Z`,
                endTime: `${plus1DateString}T05:15:00.000Z`,
                references: [
                  getMockBookingReference({
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "MOCK_ID",
                    meetingId: "MOCK_ID",
                    meetingPassword: "MOCK_PASS",
                    meetingUrl: "http://mock-dailyvideo.example.com",
                    credentialId: 0,
                  }),
                  getMockBookingReference({
                    type: appStoreMetadata.googlecalendar.type,
                    uid: "MOCK_ID",
                    meetingId: "MOCK_ID",
                    meetingPassword: "MOCK_PASSWORD",
                    meetingUrl: "https://UNUSED_URL",
                    externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                    credentialId: 1,
                  }),
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: { uid: "MOCK_ID" },
          update: { uid: "UPDATED_MOCK_ID", iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID" },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            rescheduleUid: uidOfBookingToBeRescheduled,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:15:00.000Z`,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData });

        await expectBookingInDBToBeRescheduledFromTo({
          from: { uid: uidOfBookingToBeRescheduled },
          to: {
            description: "",
            uid: createdBooking.uid!,
            eventTypeId: mockBookingData.eventTypeId,
            status: BookingStatus.PENDING,
            location: BookingLocations.CalVideo,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
          },
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingRequestedWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        });

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingRescheduledWebhook");

        expectBookingRequestedEmails({ booker, organizer, emails });
      },
      timeout
    );

    test(
      "should NOT call queueBookingRequestedWebhook when organizer reschedules their own booking requiring confirmation",
      async () => {
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

        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const uidOfBookingToBeRescheduled = "n5Wv3eHgconAED2j4gcVhP";

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
                requiresConfirmation: true,
                slotInterval: 15,
                length: 15,
                users: [{ id: 101 }],
                destinationCalendar: {
                  integration: "google_calendar",
                  externalId: "event-type-1@example.com",
                },
              },
            ],
            bookings: [
              {
                uid: uidOfBookingToBeRescheduled,
                eventTypeId: 1,
                userId: organizer.id,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T05:00:00.000Z`,
                endTime: `${plus1DateString}T05:15:00.000Z`,
                references: [
                  getMockBookingReference({
                    type: appStoreMetadata.dailyvideo.type,
                    uid: "MOCK_ID",
                    meetingId: "MOCK_ID",
                    meetingPassword: "MOCK_PASS",
                    meetingUrl: "http://mock-dailyvideo.example.com",
                    credentialId: 0,
                  }),
                  getMockBookingReference({
                    type: appStoreMetadata.googlecalendar.type,
                    uid: "MOCK_ID",
                    meetingId: "MOCK_ID",
                    meetingPassword: "MOCK_PASSWORD",
                    meetingUrl: "https://UNUSED_URL",
                    externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                    credentialId: 1,
                  }),
                ],
              },
            ],
            organizer,
            apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
          })
        );

        mockSuccessfulVideoMeetingCreation({ metadataLookupKey: "dailyvideo" });
        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: { uid: "MOCK_ID" },
          update: { uid: "UPDATED_MOCK_ID", iCalUID: "MOCKED_GOOGLE_CALENDAR_ICS_ID" },
        });

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            eventTypeId: 1,
            rescheduleUid: uidOfBookingToBeRescheduled,
            start: `${plus1DateString}T04:00:00.000Z`,
            end: `${plus1DateString}T04:15:00.000Z`,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
          userId: organizer.id,
        });

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
        });

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingRequestedWebhook");
      },
      timeout
    );
  });

  describe("Collective scheduling with confirmation required", () => {
    test(
      "should call queueBookingRequestedWebhook for collective team booking requiring confirmation",
      async ({ emails }) => {
        const handleNewBooking = getNewBookingHandler();
        const booker = getBooker({
          email: "booker@example.com",
          name: "Booker",
        });

        const otherTeamMembers = [
          {
            name: "Other Team Member 1",
            username: "other-team-member-1",
            timeZone: "Asia/Kolkata",
            defaultScheduleId: null,
            email: "other-team-member-1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstEveningShift],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
            destinationCalendar: {
              integration: TestData.apps["google-calendar"].type,
              externalId: "other-team-member-1@google-calendar.com",
            },
          },
        ];

        const organizer = getOrganizer({
          name: "Organizer",
          email: "organizer@example.com",
          id: 101,
          defaultScheduleId: null,
          schedules: [TestData.schedules.IstMorningShift],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
          destinationCalendar: {
            integration: TestData.apps["google-calendar"].type,
            externalId: "organizer@google-calendar.com",
          },
          teams: [
            {
              membership: { accepted: true },
              team: {
                id: 1,
                name: "Team 1",
                slug: "team-1",
              },
            },
          ],
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
                teamId: 1,
                slotInterval: 15,
                requiresConfirmation: true,
                schedulingType: SchedulingType.COLLECTIVE,
                length: 15,
                users: [{ id: 101 }, { id: 102 }],
                schedule: TestData.schedules.IstMorningShift,
                destinationCalendar: {
                  integration: TestData.apps["google-calendar"].type,
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
          metadataLookupKey: appStoreMetadata.dailyvideo.dirName,
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

        const mockBookingData = getMockRequestDataForBooking({
          data: {
            start: `${getDate({ dateIncrement: 1 }).dateString}T11:30:00.000Z`,
            end: `${getDate({ dateIncrement: 1 }).dateString}T11:45:00.000Z`,
            eventTypeId: 1,
            responses: {
              email: booker.email,
              name: booker.name,
              location: { optionValue: "", value: BookingLocations.CalVideo },
            },
          },
        });

        const createdBooking = await handleNewBooking({ bookingData: mockBookingData });

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingRequestedWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          teamId: 1,
        });

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingCreatedWebhook");

        expectBookingRequestedEmails({ organizer, emails });
      },
      timeout
    );
  });
});
