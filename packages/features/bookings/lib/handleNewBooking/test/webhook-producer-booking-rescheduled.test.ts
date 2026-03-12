/**
 * Integration tests verifying that the booking flow correctly invokes the webhook producer
 * for BOOKING_RESCHEDULED scenarios.
 *
 * These tests exercise the full handleNewBooking path (event type creation -> reschedule -> webhook producer invocation)
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
  expectBookingInDBToBeRescheduledFromTo,
  expectBookingToBeInDatabase,
} from "@calcom/testing/lib/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { beforeEach, describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

const timeout = process.env.CI ? 5000 : 20000;

describe("Webhook Producer - BOOKING_RESCHEDULED", () => {
  setupAndTeardown();

  beforeEach(() => {
    resetMockWebhookProducer(mockWebhookProducer);
  });

  describe("Reschedule without confirmation required", () => {
    test(
      "should call queueBookingWebhook(BOOKING_RESCHEDULED) when rescheduling a booking",
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

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_RESCHEDULED");

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_CREATED");
        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_REQUESTED");
      },
      timeout
    );

    test(
      "should call queueBookingWebhook(BOOKING_RESCHEDULED) when organizer reschedules their own booking",
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
                slotInterval: 15,
                requiresConfirmation: false,
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

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_RESCHEDULED");

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_CREATED");
        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_REQUESTED");
      },
      timeout
    );
  });

  describe("Reschedule with confirmation required", () => {
    test(
      "should call queueBookingWebhook(BOOKING_REQUESTED) instead of BOOKING_RESCHEDULED when non-organizer reschedules and confirmation is required",
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

        // Non-organizer reschedule with confirmation required -> BOOKING_REQUESTED
        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_REQUESTED");

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_RESCHEDULED");
        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_CREATED");
      },
      timeout
    );

    test(
      "should call queueBookingWebhook(BOOKING_RESCHEDULED) when organizer reschedules their own booking even with confirmation required",
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

        // Organizer reschedule bypasses confirmation -> BOOKING_RESCHEDULED
        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_RESCHEDULED");

        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_REQUESTED");
        expectWebhookProducerNotCalled(mockWebhookProducer, "queueBookingWebhook", "BOOKING_CREATED");
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

        const createdBooking = await handleNewBooking({
          bookingData: mockBookingData,
          platformClientId: "test-platform-client-id",
          platformRescheduleUrl: "https://platform.example.com/reschedule",
          platformCancelUrl: "https://platform.example.com/cancel",
          platformBookingUrl: "https://platform.example.com/booking",
        });

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

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
          platformClientId: "test-platform-client-id",
          platformRescheduleUrl: "https://platform.example.com/reschedule",
          platformCancelUrl: "https://platform.example.com/cancel",
          platformBookingUrl: "https://platform.example.com/booking",
        }, "BOOKING_RESCHEDULED");
      },
      timeout
    );
  });

  describe("rescheduledBy exclusion from webhook params", () => {
    test(
      "should not include rescheduledBy in webhook params (PII protection)",
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
            rescheduledBy: booker.email,
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

        expectWebhookProducerCalled(mockWebhookProducer, "queueBookingWebhook", {
          bookingUid: createdBooking.uid,
          eventTypeId: 1,
          userId: organizer.id,
        }, "BOOKING_RESCHEDULED");

        // Verify rescheduledBy is NOT in the webhook params (PII should not be in task payload)
        const webhookCall = mockWebhookProducer.queueBookingWebhook.mock.calls[0];
        expect(webhookCall[1]).not.toHaveProperty("rescheduledBy");
      },
      timeout
    );
  });
});
