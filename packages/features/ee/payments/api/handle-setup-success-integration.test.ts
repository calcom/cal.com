/**
 * Integration tests for the HOLD payment flow (setup_intent.succeeded) in the Stripe webhook handler.
 *
 * These tests exercise the full handleSetupSuccess path using an in-memory DB (prismock) and verify:
 * - Database entries (booking status, references, metadata including videoCallUrl)
 * - Webhook producer invocations (BOOKING_CREATED)
 * - Video meeting and calendar event creation via mocked app services
 *
 * Follows the same patterns as handleNewBooking/test/fresh-booking.test.ts.
 */
import {
  expectWebhookProducerCalled,
  expectWebhookProducerNotCalled,
  type MockWebhookProducer,
  resetMockWebhookProducer,
} from "@calcom/testing/lib/webhookProducer";

const mockWebhookProducer: MockWebhookProducer = vi.hoisted(() => ({
  queueBookingCancelledWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingRejectedWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingPaymentInitiatedWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingPaidWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingNoShowUpdatedWebhook: vi.fn().mockResolvedValue(undefined),
  queueBookingWebhook: vi.fn().mockResolvedValue(undefined),
  queueFormSubmittedWebhook: vi.fn().mockResolvedValue(undefined),
  queueRecordingWebhook: vi.fn().mockResolvedValue(undefined),
  queueOOOCreatedWebhook: vi.fn().mockResolvedValue(undefined),
  queueMeetingWebhook: vi.fn().mockResolvedValue(undefined),
  cancelDelayedWebhooks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/webhooks/lib/service/WebhookTaskerProducerService", () => {
  const MockProducer = class {
    queueBookingCancelledWebhook = mockWebhookProducer.queueBookingCancelledWebhook;
    queueBookingRejectedWebhook = mockWebhookProducer.queueBookingRejectedWebhook;
    queueBookingPaymentInitiatedWebhook = mockWebhookProducer.queueBookingPaymentInitiatedWebhook;
    queueBookingPaidWebhook = mockWebhookProducer.queueBookingPaidWebhook;
    queueBookingNoShowUpdatedWebhook = mockWebhookProducer.queueBookingNoShowUpdatedWebhook;
    queueBookingWebhook = mockWebhookProducer.queueBookingWebhook;
    queueFormSubmittedWebhook = mockWebhookProducer.queueFormSubmittedWebhook;
    queueRecordingWebhook = mockWebhookProducer.queueRecordingWebhook;
    queueOOOCreatedWebhook = mockWebhookProducer.queueOOOCreatedWebhook;
    queueMeetingWebhook = mockWebhookProducer.queueMeetingWebhook;
    cancelDelayedWebhooks = mockWebhookProducer.cancelDelayedWebhooks;
  };
  return { WebhookTaskerProducerService: MockProducer };
});

// biome-ignore lint/nursery/noImportCycles: Mock imports must come first for vitest mocking to work
import prismaMock from "@calcom/testing/lib/__mocks__/prisma";
import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getGoogleCalendarCredential,
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
import { handleSetupSuccess } from "@calcom/features/ee/payments/api/webhook";
import type { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import { BookingStatus } from "@calcom/prisma/enums";
import {
  expectBookingToBeInDatabase,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import type Stripe from "stripe";
import { beforeEach, describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "@calcom/features/bookings/lib/handleNewBooking/test/getNewBookingHandler";

const log = logger.getSubLogger({ prefix: ["[handle-setup-success.integration-test]"] });

const timeout = process.env.CI ? 5000 : 20000;

// --- Helpers ---

function getMockedStripeSetupIntentEvent({ setupIntentId }: { setupIntentId: string }) {
  return {
    id: null,
    data: {
      object: {
        id: setupIntentId,
      },
    },
  } as unknown as Stripe.Event;
}

async function mockSetupSuccessWebhookFromStripe({ externalId }: { externalId: string }) {
  let webhookResponse = null;
  try {
    const traceContext = distributedTracing.createTrace("test_stripe_setup_intent_webhook");
    await handleSetupSuccess(getMockedStripeSetupIntentEvent({ setupIntentId: externalId }), traceContext);
  } catch (e) {
    log.silly("mockSetupSuccessWebhookFromStripe:catch", JSON.stringify(e));
    webhookResponse = e as HttpError;
  }
  return { webhookResponse };
}

// --- Tests ---

describe("handleSetupSuccess - HOLD payment integration tests", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetMockWebhookProducer(mockWebhookProducer);
  });

  describe("HOLD payment without confirmation required", () => {
    test(
      `Event Type with HOLD payment and !requiresConfirmation
          1. handleNewBooking creates a PENDING booking with a payment record
          2. handleSetupSuccess (setup_intent.succeeded) fires
          3. Booking status should become ACCEPTED in DB
          4. Booking should have video meeting references
          5. Booking metadata should have videoCallUrl
          6. BOOKING_CREATED webhook should be fired via webhook producer
      `,
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
              title: "HOLD Payment Event",
              description: "Test HOLD Payment Event",
              slotInterval: 30,
              requiresConfirmation: false,
              metadata: {
                apps: {
                  stripe: {
                    price: 100,
                    enabled: true,
                    currency: "inr",
                    paymentOption: "HOLD",
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
          videoMeetingData: {
            id: "MOCK_ID",
            password: "MOCK_PASS",
            url: `http://mock-dailyvideo.example.com/meeting-1`,
          },
        });

        const { paymentUid, externalId } = mockPaymentApp({
          metadataLookupKey: "stripe",
          appStoreLookupKey: "stripepayment",
        });

        mockCalendarToHaveNoBusySlots("googlecalendar", {
          create: {
            id: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
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

        // Step 1: Create booking via handleNewBooking — should be PENDING with payment
        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        expect(createdBooking).toEqual(
          expect.objectContaining({
            location: BookingLocations.CalVideo,
            paymentUid: paymentUid,
          })
        );

        await expectBookingToBeInDatabase({
          description: "",
          location: BookingLocations.CalVideo,
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        // Step 2: Fire the setup_intent.succeeded webhook
        const { webhookResponse } = await mockSetupSuccessWebhookFromStripe({ externalId });
        // handleSetupSuccess doesn't return a response object like the HTTP handler does,
        // so a null webhookResponse means no error was thrown — i.e. success
        expect(webhookResponse).toBeNull();

        // Step 3: Verify booking is now ACCEPTED with video meeting reference
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
          ],
        });

        // Step 4: Verify videoCallUrl is set in booking metadata
        const updatedBooking = await prismaMock.booking.findUnique({
          where: { uid: createdBooking.uid! },
        });
        expect(updatedBooking?.metadata).toEqual(
          expect.objectContaining({
            videoCallUrl: expect.stringContaining("http"),
          })
        );

        // Step 5: Verify BOOKING_CREATED webhook was fired
        expectWebhookProducerCalled(
          mockWebhookProducer,
          "queueBookingWebhook",
          {
            bookingUid: createdBooking.uid,
            eventTypeId: 1,
            userId: organizer.id,
          },
          "BOOKING_CREATED"
        );
      },
      timeout
    );
  });

  describe("HOLD payment with confirmation required", () => {
    test(
      `Event Type with HOLD payment and requiresConfirmation
          1. handleNewBooking creates a PENDING booking with a payment record
          2. handleSetupSuccess (setup_intent.succeeded) fires
          3. Booking should remain PENDING (paid but not confirmed)
          4. Booking should NOT have video meeting references yet
          5. BOOKING_CREATED webhook should NOT be fired
      `,
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
              title: "HOLD Payment Event - Requires Confirmation",
              description: "Test HOLD Payment Event requiring confirmation",
              slotInterval: 30,
              requiresConfirmation: true,
              metadata: {
                apps: {
                  stripe: {
                    price: 100,
                    enabled: true,
                    currency: "inr",
                    paymentOption: "HOLD",
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

        // Step 1: Create booking via handleNewBooking — should be PENDING with payment
        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        expect(createdBooking).toEqual(
          expect.objectContaining({
            paymentUid: paymentUid,
          })
        );

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.PENDING,
        });

        // Step 2: Fire the setup_intent.succeeded webhook
        const { webhookResponse } = await mockSetupSuccessWebhookFromStripe({ externalId });
        expect(webhookResponse).toBeNull();

        // Step 3: Verify booking is still PENDING (paid but awaiting confirmation)
        // The booking status should remain PENDING since requiresConfirmation is true
        // and handleConfirmation is NOT called in this path
        const updatedBooking = await prismaMock.booking.findUnique({
          where: { uid: createdBooking.uid! },
          include: { references: true },
        });

        expect(updatedBooking?.paid).toBe(true);
        // When requiresConfirmation is true, booking stays PENDING
        expect(updatedBooking?.status).toBe(BookingStatus.PENDING);

        // Step 4: Verify no references were created (handleConfirmation was not called)
        expect(updatedBooking?.references).toHaveLength(0);

        // Step 5: BOOKING_CREATED webhook should NOT have been fired
        // (it's only fired inside handleConfirmation which is skipped when requiresConfirmation)
        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_CREATED");
      },
      timeout
    );
  });

  describe("HOLD payment duplicate webhook handling", () => {
    test(
      `should skip processing when booking is already paid (duplicate setup_intent webhook)`,
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
          credentials: [getGoogleCalendarCredential(), getStripeAppCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        });

        const scenarioData = getScenarioData({
          eventTypes: [
            {
              id: 1,
              title: "HOLD Payment Event",
              description: "Test HOLD Payment Event",
              slotInterval: 30,
              requiresConfirmation: false,
              metadata: {
                apps: {
                  stripe: {
                    price: 100,
                    enabled: true,
                    currency: "inr",
                    paymentOption: "HOLD",
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

        const { externalId } = mockPaymentApp({
          metadataLookupKey: "stripe",
          appStoreLookupKey: "stripepayment",
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

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
        });

        // First webhook call — should succeed
        const { webhookResponse: firstResponse } = await mockSetupSuccessWebhookFromStripe({ externalId });
        expect(firstResponse).toBeNull();

        await expectBookingToBeInDatabase({
          uid: createdBooking.uid!,
          status: BookingStatus.ACCEPTED,
        });

        // Second (duplicate) webhook call — should throw "Already processed" (status 200)
        const { webhookResponse: duplicateResponse } = await mockSetupSuccessWebhookFromStripe({
          externalId,
        });

        expect(duplicateResponse).not.toBeNull();
        expect((duplicateResponse as HttpError)?.statusCode).toBe(200);
        expect((duplicateResponse as HttpError)?.message).toBe("Already processed");
      },
      timeout
    );
  });
});
