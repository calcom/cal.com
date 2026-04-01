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

describe("BOOKING_CANCELLED Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockBookingDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const createMockCalendarEvent = (overrides = {}) => ({
    type: "Test Event",
    title: "Cancelled Booking",
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
    cancellationReason: "Schedule conflict",
    ...overrides,
  });

  const createMockBooking = (overrides = {}) => ({
    id: 123,
    uid: "booking-uid-123",
    eventTypeId: 456,
    userId: 789,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    status: "CANCELLED",
    smsReminderNumber: null,
    iCalSequence: 2,
    assignmentReason: null,
    cancellationReason: "Schedule conflict",
    cancelledBy: "user@example.com",
    metadata: { videoCallUrl: "https://cal.com/video/test-123" },
    user: {
      id: 789,
      email: "organizer@example.com",
      name: "Organizer",
    },
    eventType: {
      id: 456,
      title: "Test Event Type",
      description: "Test event type description",
      requiresConfirmation: false,
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
        data: {
          calendarEvent: createMockCalendarEvent(),
          booking: createMockBooking(),
        },
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
          triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
          createdAt: new Date().toISOString(),
          payload: {
            type: "Test Event Type",
            title: "Cancelled Booking",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            organizer: { email: "organizer@example.com" },
            attendees: [{ email: "attendee@example.com" }],
            status: "CANCELLED",
            cancelledBy: "user@example.com",
            cancellationReason: "Schedule conflict",
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

  describe("Cancelled booking", () => {
    it("should process BOOKING_CANCELLED when a booking is cancelled", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-booking-cancelled-1",
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
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
          eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-booking-cancelled-1");

      expect(mockBookingDataFetcher.canHandle).toHaveBeenCalledWith(WebhookTriggerEvents.BOOKING_CANCELLED);
      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_CANCELLED,
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            subscriberUrl: "https://example.com/webhook",
          }),
        ])
      );
    });

    it("should not send webhook when no subscribers match", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-booking-cancelled-no-sub",
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        bookingUid: "booking-uid-123",
        eventTypeId: 456,
        userId: 789,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([]);

      await consumer.processWebhookTask(payload, "task-no-sub");

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should not send webhook when event data is null", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({ data: null });

      const payload: BookingWebhookTaskPayload = {
        operationId: "op-no-event-data",
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        bookingUid: "nonexistent-uid",
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
          eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-no-data");

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });

  describe("Team/Collective scheduling", () => {
    it("should process BOOKING_CANCELLED for team event", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-team-cancelled",
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
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
          eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-team-cancelled");

      expect(mockBookingDataFetcher.getSubscriberContext).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 111,
          orgId: 222,
        })
      );
      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
    });
  });

  describe("Integration: real PayloadBuilder verifies webhook payload content", () => {
    const realPayloadBuilderFactory = createPayloadBuilderFactory();

    const defaultSubscriber = {
      id: "sub-1",
      subscriberUrl: "https://example.com/webhook",
      payloadTemplate: null,
      appId: null,
      secret: "secret",
      time: null,
      timeUnit: null,
      eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
      version: WebhookVersion.V_2021_10_20,
    };

    function buildConsumerWithRealBuilder() {
      return new WebhookTaskConsumer(
        mockWebhookRepository,
        [mockBookingDataFetcher],
        realPayloadBuilderFactory,
        mockWebhookService,
        mockLogger
      );
    }

    function getDeliveredPayload(): Record<string, unknown> {
      const [, webhookPayload] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      return (webhookPayload as { triggerEvent: string; createdAt: string; payload: Record<string, unknown> })
        .payload;
    }

    function getDeliveredWebhookEnvelope(): {
      triggerEvent: string;
      createdAt: string;
      payload: Record<string, unknown>;
    } {
      const [, webhookPayload] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      return webhookPayload as { triggerEvent: string; createdAt: string; payload: Record<string, unknown> };
    }

    it("delivers CANCELLED status and BOOKING_CANCELLED triggerEvent in payload", async () => {
      const timestamp = "2024-06-15T10:00:00.000Z";
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        data: {
          calendarEvent: createMockCalendarEvent(),
          booking: createMockBooking({
            smsReminderNumber: "+15551234567",
            iCalSequence: 3,
          }),
        },
      });

      const payload: BookingWebhookTaskPayload = {
        operationId: "op-status-check",
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        bookingUid: "booking-uid-123",
        eventTypeId: 456,
        userId: 789,
        timestamp,
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(payload, "task-status");

      const envelope = getDeliveredWebhookEnvelope();
      expect(envelope.triggerEvent).toBe("BOOKING_CANCELLED");
      expect(envelope.createdAt).toBe(timestamp);

      const p = getDeliveredPayload();
      expect(p.status).toBe("CANCELLED");
      expect(p.smsReminderNumber).toBe("+15551234567");
    });

    it("includes cancelledBy, cancellationReason, and requestReschedule fields", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        data: {
          calendarEvent: createMockCalendarEvent(),
          booking: createMockBooking({
            cancelledBy: "canceller@example.com",
            cancellationReason: "No longer needed",
          }),
        },
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-cancel-fields",
          triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-cancel-fields"
      );

      const p = getDeliveredPayload();
      expect(p.cancelledBy).toBe("canceller@example.com");
      expect(p.cancellationReason).toBe("No longer needed");
      expect(p.requestReschedule).toBe(false);
    });

    it("includes metadata from booking when present", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        data: {
          calendarEvent: createMockCalendarEvent(),
          booking: createMockBooking({
            metadata: { videoCallUrl: "https://cal.com/video/xyz" },
          }),
        },
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-metadata",
          triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-metadata"
      );

      const p = getDeliveredPayload();
      expect(p.metadata).toEqual({ videoCallUrl: "https://cal.com/video/xyz" });
    });

    it("handles cancellation without cancelledBy (unauthenticated cancellation)", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        data: {
          calendarEvent: createMockCalendarEvent(),
          booking: createMockBooking({
            cancelledBy: null,
            cancellationReason: null,
          }),
        },
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-no-cancelled-by",
          triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-no-cancelled-by"
      );

      const p = getDeliveredPayload();
      expect(p.cancelledBy).toBeUndefined();
      expect(p.cancellationReason).toBeUndefined();
      expect(p.requestReschedule).toBe(false);
    });

    it("includes eventTitle, eventDescription, price, currency, and length from event type", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        data: {
          calendarEvent: createMockCalendarEvent(),
          booking: createMockBooking({
            eventType: {
              id: 456,
              title: "Consultation Call",
              description: "30-minute consultation",
              requiresConfirmation: false,
              price: 5000,
              currency: "INR",
              length: 30,
            },
          }),
        },
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-evt-type",
          triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-evt-type"
      );

      const p = getDeliveredPayload();
      expect(p.eventTitle).toBe("Consultation Call");
      expect(p.eventDescription).toBe("30-minute consultation");
      expect(p.price).toBe(5000);
      expect(p.currency).toBe("INR");
      expect(p.length).toBe(30);
    });
  });
});
