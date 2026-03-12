/**
 * Integration tests verifying that the booking flow correctly invokes the webhook producer
 * for BOOKING_CREATED scenarios.
 *
 * These tests exercise the full handleNewBooking path (event type creation -> booking -> webhook producer invocation)
 * and assert that deps.webhookProducer.queueBookingWebhook is called (or not called) with correct params.
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
  queueRecordingReadyWebhook: vi.fn().mockResolvedValue(undefined),
  queueOOOCreatedWebhook: vi.fn().mockResolvedValue(undefined),
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
    queueRecordingReadyWebhook = mockWebhookProducer.queueRecordingReadyWebhook;
    queueOOOCreatedWebhook = mockWebhookProducer.queueOOOCreatedWebhook;
  };
  return { WebhookTaskerProducerService: MockProducer };
});

import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getGoogleCalendarCredential,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { BookingStatus } from "@calcom/prisma/enums";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulBookingCreationEmails,
  expectICalUIDAsString,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { beforeEach, describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

describe("Webhook Producer - BOOKING_CREATED", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetMockWebhookProducer(mockWebhookProducer);
  });

  describe("Fresh booking without confirmation required", () => {
    test(
      "should call queueBookingWebhook(BOOKING_CREATED) when event type does not require confirmation",
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
                requiresConfirmation: false,
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

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_CREATED");

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_REQUESTED");
        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_RESCHEDULED");

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

    test(
      "should call queueBookingWebhook(BOOKING_CREATED) even when booker is the organizer",
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
                requiresConfirmation: false,
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
          status: BookingStatus.ACCEPTED,
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_CREATED");

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

  describe("Booking with confirmation required should NOT fire BOOKING_CREATED", () => {
    test(
      "should call queueBookingWebhook(BOOKING_REQUESTED) instead of BOOKING_CREATED when confirmation is required",
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

        // Should fire BOOKING_REQUESTED, not BOOKING_CREATED
        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_REQUESTED");

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_CREATED");
      },
      timeout
    );
  });

  describe("Confirmation threshold not met should fire BOOKING_CREATED", () => {
    test(
      "should call queueBookingWebhook(BOOKING_CREATED) when confirmation threshold is not met (booking is auto-confirmed)",
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

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_CREATED");

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_REQUESTED");

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

  describe("Platform fields", () => {
    test(
      "should pass platform fields to queueBookingWebhook when provided",
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
                requiresConfirmation: false,
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
          platformClientId: "test-platform-client-id",
          platformRescheduleUrl: "https://platform.example.com/reschedule",
          platformCancelUrl: "https://platform.example.com/cancel",
          platformBookingUrl: "https://platform.example.com/booking",
        });

        await expectBookingToBeInDatabase({
          description: "",
          uid: createdBooking.uid!,
          eventTypeId: mockBookingData.eventTypeId,
          status: BookingStatus.ACCEPTED,
        });

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
          platformClientId: "test-platform-client-id",
          platformRescheduleUrl: "https://platform.example.com/reschedule",
          platformCancelUrl: "https://platform.example.com/cancel",
          platformBookingUrl: "https://platform.example.com/booking",
        }, "BOOKING_CREATED");
      },
      timeout
    );
  });
});
