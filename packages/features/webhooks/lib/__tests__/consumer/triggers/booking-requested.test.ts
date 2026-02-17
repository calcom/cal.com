import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayloadBuilderFactory } from "../../../factory/versioned/PayloadBuilderFactory";
import { createPayloadBuilderFactory } from "../../../factory/versioned/registry";
import type { IWebhookDataFetcher } from "../../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../../interface/IWebhookRepository";
import { WebhookVersion } from "../../../interface/IWebhookRepository";
import type { ILogger } from "../../../interface/infrastructure";
import type { IWebhookService } from "../../../interface/services";
import { WebhookTaskConsumer } from "../../../service/WebhookTaskConsumer";
import type { BookingWebhookTaskPayload } from "../../../types/webhookTask";

/**
 * BOOKING_REQUESTED Trigger Tests
 *
 * Tests specific to the BOOKING_REQUESTED webhook trigger.
 * This trigger fires when a booking requires confirmation (opt-in booking).
 *
 * Scenarios covered:
 * - Event types that require confirmation
 * - Paid events that require confirmation
 * - Reschedule scenarios with confirmation required
 * - Team/collective scheduling with confirmation required
 */
describe("BOOKING_REQUESTED Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockBookingDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const createMockCalendarEvent = (overrides = {}) => ({
    type: "Test Event",
    title: "Test Booking",
    description: "Test description",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    organizer: {
      id: 1,
      email: "organizer@example.com",
      name: "Organizer",
      timeZone: "UTC",
      language: { locale: "en" },
    },
    attendees: [
      {
        email: "attendee@example.com",
        name: "Attendee",
        timeZone: "UTC",
        language: { locale: "en" },
      },
    ],
    location: "https://cal.com/video/test",
    ...overrides,
  });

  const createMockBooking = (overrides = {}) => ({
    id: 123,
    uid: "booking-uid-123",
    eventTypeId: 456,
    userId: 789,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    status: "PENDING",
    smsReminderNumber: null,
    iCalSequence: 0,
    assignmentReason: null,
    user: {
      id: 789,
      email: "organizer@example.com",
      name: "Organizer",
    },
    eventType: {
      id: 456,
      title: "Test Event Type",
      description: "Test event type description",
      requiresConfirmation: true,
      price: 0,
      currency: "USD",
      length: 60,
    },
    ...overrides,
  });

  beforeEach(() => {
    mockWebhookRepository = {
      getSubscribers: vi.fn().mockResolvedValue([]),
      getWebhookById: vi.fn(),
      findByWebhookId: vi.fn(),
      findByOrgIdAndTrigger: vi.fn(),
      getFilteredWebhooksForUser: vi.fn(),
    } as unknown as IWebhookRepository;

    mockBookingDataFetcher = {
      canHandle: vi.fn((event) =>
        [
          WebhookTriggerEvents.BOOKING_CREATED,
          WebhookTriggerEvents.BOOKING_CANCELLED,
          WebhookTriggerEvents.BOOKING_RESCHEDULED,
          WebhookTriggerEvents.BOOKING_REQUESTED,
          WebhookTriggerEvents.BOOKING_REJECTED,
          WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        ].includes(event)
      ),
      fetchEventData: vi.fn().mockResolvedValue({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking(),
      }),
      getSubscriberContext: vi.fn((payload: BookingWebhookTaskPayload) => ({
        triggerEvent: payload.triggerEvent,
        userId: payload.userId,
        eventTypeId: payload.eventTypeId,
        teamId: payload.teamId,
        orgId: payload.orgId,
        oAuthClientId: payload.oAuthClientId,
      })),
    };

    mockPayloadBuilderFactory = {
      getBuilder: vi.fn().mockReturnValue({
        build: vi.fn().mockReturnValue({
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          createdAt: new Date().toISOString(),
          payload: {
            type: "Test Event Type",
            title: "Test Booking",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            organizer: { email: "organizer@example.com" },
            attendees: [{ email: "attendee@example.com" }],
            metadata: {},
          },
        }),
      }),
    } as unknown as PayloadBuilderFactory;

    mockWebhookService = {
      processWebhooks: vi.fn().mockResolvedValue(undefined),
    } as unknown as IWebhookService;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    consumer = new WebhookTaskConsumer(
      mockWebhookRepository,
      [mockBookingDataFetcher],
      mockPayloadBuilderFactory,
      mockWebhookService,
      mockLogger
    );
  });

  describe("Event Type that requires confirmation", () => {
    it("should process BOOKING_REQUESTED when event type requires confirmation", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-booking-requested-1",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-123",
        eventTypeId: 456,
        userId: 789,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-1",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: "webhook-secret",
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-booking-requested-1");

      expect(mockBookingDataFetcher.canHandle).toHaveBeenCalledWith(WebhookTriggerEvents.BOOKING_REQUESTED);
      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_REQUESTED,
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            subscriberUrl: "https://example.com/webhook",
          }),
        ])
      );
    });

    it("should include metadata in BOOKING_REQUESTED payload", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-booking-requested-2",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-456",
        eventTypeId: 456,
        userId: 789,
        metadata: { customField: "customValue", source: "api" },
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-1",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-booking-requested-2");

      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { customField: "customValue", source: "api" },
        })
      );
    });

    it("should handle BOOKING_REQUESTED for booker who is the organizer", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-organizer-booking",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-organizer",
        eventTypeId: 456,
        userId: 789,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-1",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-organizer-booking");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
    });
  });

  describe("Paid Events with confirmation required", () => {
    it("should process BOOKING_REQUESTED for paid event after payment success", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-paid-booking",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-paid",
        eventTypeId: 456,
        userId: 789,
        metadata: { paymentId: "payment-123", paymentStatus: "success" },
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking({
          eventType: {
            id: 456,
            title: "Paid Consultation",
            description: "Paid event requiring confirmation",
            requiresConfirmation: true,
            price: 5000,
            currency: "USD",
            length: 60,
          },
        }),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-paid",
          subscriberUrl: "https://example.com/paid-webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-paid-booking");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_REQUESTED,
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            subscriberUrl: "https://example.com/paid-webhook",
          }),
        ])
      );
    });
  });

  describe("Reschedule scenarios", () => {
    it("should process BOOKING_REQUESTED when rescheduling a booking that requires confirmation", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-reschedule",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-rescheduled",
        eventTypeId: 456,
        userId: 789,
        metadata: { rescheduleUid: "original-booking-uid" },
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-reschedule",
          subscriberUrl: "https://example.com/reschedule-webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-reschedule");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
    });
  });

  describe("Team/Collective scheduling", () => {
    it("should process BOOKING_REQUESTED for team event with confirmation required", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-team-booking",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-team",
        eventTypeId: 456,
        userId: 789,
        teamId: 111,
        orgId: 222,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-team",
          subscriberUrl: "https://example.com/team-webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-team-booking");

      expect(mockBookingDataFetcher.getSubscriberContext).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 111,
          orgId: 222,
        })
      );
      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
    });

    it("should fetch subscribers with correct team and org context", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-collective",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-collective",
        eventTypeId: 456,
        teamId: 333,
        orgId: 444,
        timestamp: new Date().toISOString(),
      };

      await consumer.processWebhookTask(payload, "task-collective");

      expect(mockWebhookRepository.getSubscribers).toHaveBeenCalledWith({
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        userId: undefined,
        eventTypeId: 456,
        teamId: 333,
        orgId: 444,
        oAuthClientId: undefined,
      });
    });
  });

  describe("OAuth/Platform client scenarios", () => {
    it("should process BOOKING_REQUESTED with OAuth client context", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-oauth",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-oauth",
        eventTypeId: 456,
        userId: 789,
        oAuthClientId: "oauth-client-123",
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-oauth",
          subscriberUrl: "https://platform.example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: "platform-secret",
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-oauth");

      expect(mockWebhookRepository.getSubscribers).toHaveBeenCalledWith(
        expect.objectContaining({
          oAuthClientId: "oauth-client-123",
        })
      );
      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
    });
  });

  describe("Integration: real PayloadBuilder (legacy shape)", () => {
    const realPayloadBuilderFactory = createPayloadBuilderFactory();

    it("metadata.videoCallUrl is absent when task payload has no metadata (documents consumer-path behaviour)", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-no-metadata",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-123",
        eventTypeId: 456,
        userId: 789,
        timestamp: new Date().toISOString(),
        // Intentionally no metadata (or metadata: {}) so videoCallUrl is not supplied
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-1",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: "secret",
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      const consumerWithRealBuilder = new WebhookTaskConsumer(
        mockWebhookRepository,
        [mockBookingDataFetcher],
        realPayloadBuilderFactory,
        mockWebhookService,
        mockLogger
      );

      await consumerWithRealBuilder.processWebhookTask(payload, "task-real-builder");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();

      const [, webhookPayload] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      const payloadPayload = (webhookPayload as { payload: Record<string, unknown> }).payload;

      expect(payloadPayload.metadata?.videoCallUrl).toBeUndefined();
    });
  });
});
