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
 * BOOKING_RESCHEDULED Trigger Tests
 *
 * Tests specific to the BOOKING_RESCHEDULED webhook trigger.
 * This trigger fires when a booking is rescheduled.
 *
 * Scenarios covered:
 * - Rescheduled bookings with previous booking data
 * - rescheduledBy field from previous booking (PII fetched from DB, not task payload)
 * - Team/collective scheduling reschedules
 * - Platform fields (platformClientId, platformRescheduleUrl, platformCancelUrl, platformBookingUrl)
 */
describe("BOOKING_RESCHEDULED Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockBookingDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const previousBookingStartTime = new Date("2024-06-10T09:00:00.000Z");
  const previousBookingEndTime = new Date("2024-06-10T10:00:00.000Z");

  const createMockCalendarEvent = (overrides = {}) => ({
    type: "Test Event",
    title: "Test Booking (Rescheduled)",
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
    id: 124,
    uid: "booking-uid-124",
    eventTypeId: 456,
    userId: 789,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    status: "ACCEPTED",
    smsReminderNumber: null,
    iCalSequence: 1,
    assignmentReason: null,
    fromReschedule: "booking-uid-123",
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

  const createMockPreviousBooking = (overrides = {}) => ({
    id: 123,
    uid: "booking-uid-123",
    startTime: previousBookingStartTime,
    endTime: previousBookingEndTime,
    rescheduledBy: "attendee@example.com",
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
        previousBooking: createMockPreviousBooking(),
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
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          createdAt: new Date().toISOString(),
          payload: {
            type: "Test Event Type",
            title: "Test Booking (Rescheduled)",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            organizer: { email: "organizer@example.com" },
            attendees: [{ email: "attendee@example.com" }],
            metadata: {},
            status: "ACCEPTED",
            rescheduleId: 123,
            rescheduleUid: "booking-uid-123",
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

  describe("Rescheduled booking", () => {
    it("should process BOOKING_RESCHEDULED when a booking is rescheduled", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-booking-rescheduled-1",
        triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
        bookingUid: "booking-uid-124",
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
          eventTriggers: [WebhookTriggerEvents.BOOKING_RESCHEDULED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-booking-rescheduled-1");

      expect(mockBookingDataFetcher.canHandle).toHaveBeenCalledWith(WebhookTriggerEvents.BOOKING_RESCHEDULED);
      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_RESCHEDULED,
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            subscriberUrl: "https://example.com/webhook",
          }),
        ])
      );
    });

    it("should include metadata in BOOKING_RESCHEDULED payload", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-booking-rescheduled-2",
        triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
        bookingUid: "booking-uid-456",
        eventTypeId: 456,
        userId: 789,
        metadata: { videoCallUrl: "https://cal.com/video/rescheduled" },
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
          eventTriggers: [WebhookTriggerEvents.BOOKING_RESCHEDULED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-booking-rescheduled-2");

      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { videoCallUrl: "https://cal.com/video/rescheduled" },
        })
      );
    });
  });

  describe("Team/Collective scheduling", () => {
    it("should process BOOKING_RESCHEDULED for team event", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-team-reschedule",
        triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
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
          eventTriggers: [WebhookTriggerEvents.BOOKING_RESCHEDULED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-team-reschedule");

      expect(mockBookingDataFetcher.getSubscriberContext).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 111,
          orgId: 222,
        })
      );
      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
    });
  });

  describe("Platform fields", () => {
    it("should pass platform fields through the task payload to fetchEventData", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-platform-rescheduled",
        triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
        bookingUid: "booking-uid-platform",
        eventTypeId: 456,
        userId: 789,
        platformClientId: "test-platform-client-id",
        platformRescheduleUrl: "https://platform.example.com/reschedule",
        platformCancelUrl: "https://platform.example.com/cancel",
        platformBookingUrl: "https://platform.example.com/booking",
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-platform",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_RESCHEDULED],
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      await consumer.processWebhookTask(payload, "task-platform-rescheduled");

      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          platformClientId: "test-platform-client-id",
          platformRescheduleUrl: "https://platform.example.com/reschedule",
          platformCancelUrl: "https://platform.example.com/cancel",
          platformBookingUrl: "https://platform.example.com/booking",
        })
      );
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
      eventTriggers: [WebhookTriggerEvents.BOOKING_RESCHEDULED],
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

    it("delivers ACCEPTED status and BOOKING_RESCHEDULED triggerEvent in payload", async () => {
      const timestamp = "2024-06-15T10:00:00.000Z";
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-status-check",
        triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
        bookingUid: "booking-uid-124",
        eventTypeId: 456,
        userId: 789,
        timestamp,
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(payload, "task-status");

      const envelope = getDeliveredWebhookEnvelope();
      expect(envelope.triggerEvent).toBe("BOOKING_RESCHEDULED");
      expect(envelope.createdAt).toBe(timestamp);

      const p = getDeliveredPayload();
      expect(p.status).toBe("ACCEPTED");
    });

    it("includes rescheduleId, rescheduleUid, rescheduleStartTime, and rescheduleEndTime from previous booking", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-reschedule-fields",
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-uid-124",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-reschedule-fields"
      );

      const p = getDeliveredPayload();
      expect(p.rescheduleId).toBe(123);
      expect(p.rescheduleUid).toBe("booking-uid-123");
      expect(p.rescheduleStartTime).toBe(previousBookingStartTime.toISOString());
      expect(p.rescheduleEndTime).toBe(previousBookingEndTime.toISOString());
    });

    it("includes rescheduledBy from previous booking (fetched from DB, not task payload)", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-rescheduled-by",
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-uid-124",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-rescheduled-by"
      );

      const p = getDeliveredPayload();
      expect(p.rescheduledBy).toBe("attendee@example.com");
    });

    it("rescheduledBy is undefined when previous booking has null rescheduledBy", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking(),
        previousBooking: createMockPreviousBooking({ rescheduledBy: null }),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-no-rescheduled-by",
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-uid-124",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-no-rescheduled-by"
      );

      const p = getDeliveredPayload();
      expect(p.rescheduledBy).toBeUndefined();
    });

    it("includes eventTitle, eventDescription, requiresConfirmation, price, currency, and length from event type", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking({
          eventType: {
            id: 456,
            title: "Rescheduled Consultation",
            description: "60-minute rescheduled session",
            requiresConfirmation: false,
            price: 5000,
            currency: "GBP",
            length: 60,
          },
        }),
        previousBooking: createMockPreviousBooking(),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-evt-type",
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-uid-124",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-evt-type"
      );

      const p = getDeliveredPayload();
      expect(p.eventTitle).toBe("Rescheduled Consultation");
      expect(p.eventDescription).toBe("60-minute rescheduled session");
      expect(p.requiresConfirmation).toBe(false);
      expect(p.price).toBe(5000);
      expect(p.currency).toBe("GBP");
      expect(p.length).toBe(60);
    });

    it("includes bookingId, title, location, organizer, and attendees from calendar event", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent({
          title: "My Rescheduled Booking",
          location: "https://cal.com/video/xyz",
          organizer: {
            id: 1,
            email: "host@example.com",
            name: "Host User",
            timeZone: "America/New_York",
            language: { locale: "en" },
          },
          attendees: [
            {
              email: "guest@example.com",
              name: "Guest User",
              timeZone: "Europe/London",
              language: { locale: "en" },
            },
          ],
        }),
        booking: createMockBooking({ id: 999 }),
        previousBooking: createMockPreviousBooking(),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-cal-evt",
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-uid-124",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-cal-evt"
      );

      const p = getDeliveredPayload();
      expect(p.bookingId).toBe(999);
      expect(p.title).toBe("My Rescheduled Booking");
      expect(p.location).toBe("https://cal.com/video/xyz");
      expect(p.organizer).toEqual(
        expect.objectContaining({
          email: "host@example.com",
          name: "Host User",
          timeZone: "America/New_York",
        })
      );
      expect(p.attendees).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: "guest@example.com",
            name: "Guest User",
            timeZone: "Europe/London",
          }),
        ])
      );
    });

    it("includes metadata with videoCallUrl when provided", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking({
          metadata: { videoCallUrl: "https://cal.com/video/rescheduled-123" },
        }),
        previousBooking: createMockPreviousBooking(),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-metadata",
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-uid-124",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-metadata"
      );

      const p = getDeliveredPayload();
      expect(p.metadata).toBeDefined();
      expect((p.metadata as Record<string, unknown>).videoCallUrl).toBe(
        "https://cal.com/video/rescheduled-123"
      );
    });

    it("includes platformClientId from task payload in the built DTO", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-platform-client",
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-uid-124",
          eventTypeId: 456,
          userId: 789,
          platformClientId: "test-platform-client-id",
          platformRescheduleUrl: "https://platform.example.com/reschedule",
          platformCancelUrl: "https://platform.example.com/cancel",
          platformBookingUrl: "https://platform.example.com/booking",
          timestamp: new Date().toISOString(),
        },
        "task-platform-client"
      );

      // Verify processWebhooks was called (payload was built successfully with platform fields)
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_RESCHEDULED,
        expect.any(Object),
        expect.any(Array)
      );
    });
  });
});
