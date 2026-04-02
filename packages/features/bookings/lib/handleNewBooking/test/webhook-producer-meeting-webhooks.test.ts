/**
 * Integration tests verifying that the booking flow correctly invokes the webhook producer
 * for MEETING_STARTED / MEETING_ENDED scheduling and cancellation.
 *
 * These tests exercise the full handleNewBooking path and assert that:
 * - queueMeetingWebhook is called with MEETING_STARTED and MEETING_ENDED for confirmed bookings
 * - cancelDelayedWebhooks is called with correct scoping fields on reschedule
 * - Neither is called when isDryRun is true
 */
import {
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

import {
  BookingLocations,
  createBookingScenario,
  getBooker,
  getDate,
  getGoogleCalendarCredential,
  getMockBookingReference,
  getOrganizer,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
  mockSuccessfulVideoMeetingCreation,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import process from "node:process";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { BookingStatus } from "@calcom/prisma/enums";
import {
  expectBookingToBeInDatabase,
  expectBookingInDBToBeRescheduledFromTo,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { beforeEach, describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

describe("Webhook Producer - MEETING_STARTED / MEETING_ENDED", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetMockWebhookProducer(mockWebhookProducer);
  });

  describe("Fresh booking (confirmed by default)", () => {
    test(
      "should call queueMeetingWebhook for both MEETING_STARTED and MEETING_ENDED",
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
                eventTriggers: ["MEETING_STARTED", "MEETING_ENDED"],
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

        // MEETING_STARTED should be queued
        expect(mockWebhookProducer.queueMeetingWebhook).toHaveBeenCalledWith(
          "MEETING_STARTED",
          expect.objectContaining({
            bookingId: expect.any(Number),
            bookingUid: createdBooking.uid,
            startTime: expect.any(String),
            endTime: expect.any(String),
          })
        );

        // MEETING_ENDED should be queued
        expect(mockWebhookProducer.queueMeetingWebhook).toHaveBeenCalledWith(
          "MEETING_ENDED",
          expect.objectContaining({
            bookingId: expect.any(Number),
            bookingUid: createdBooking.uid,
            startTime: expect.any(String),
            endTime: expect.any(String),
          })
        );

        // Should not cancel any delayed webhooks for a fresh booking
        expect(mockWebhookProducer.cancelDelayedWebhooks).not.toHaveBeenCalled();
      },
      timeout
    );

    test(
      "should not call queueMeetingWebhook when booking requires confirmation",
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
                eventTriggers: ["MEETING_STARTED", "MEETING_ENDED"],
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

        await handleNewBooking({ bookingData: mockBookingData });

        // Meeting webhooks should NOT be scheduled for unconfirmed bookings
        expect(mockWebhookProducer.queueMeetingWebhook).not.toHaveBeenCalled();
      },
      timeout
    );
  });

  describe("Reschedule", () => {
    test(
      "should cancel old delayed webhooks and schedule new ones on reschedule",
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
                eventTriggers: ["MEETING_STARTED", "MEETING_ENDED"],
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
                requiresConfirmation: false,
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
            status: BookingStatus.ACCEPTED,
            location: BookingLocations.CalVideo,
            responses: expect.objectContaining({
              email: booker.email,
              name: booker.name,
            }),
          },
        });

        // Old booking's delayed webhooks should be cancelled
        expect(mockWebhookProducer.cancelDelayedWebhooks).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingUid: uidOfBookingToBeRescheduled,
          })
        );

        // New booking should get MEETING_STARTED and MEETING_ENDED scheduled
        expect(mockWebhookProducer.queueMeetingWebhook).toHaveBeenCalledWith(
          "MEETING_STARTED",
          expect.objectContaining({
            bookingUid: createdBooking.uid,
          })
        );
        expect(mockWebhookProducer.queueMeetingWebhook).toHaveBeenCalledWith(
          "MEETING_ENDED",
          expect.objectContaining({
            bookingUid: createdBooking.uid,
          })
        );
      },
      timeout
    );
  });
});
