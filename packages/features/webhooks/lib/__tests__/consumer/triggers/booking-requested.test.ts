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
      eventTriggers: [WebhookTriggerEvents.BOOKING_REQUESTED],
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
      return (webhookPayload as { triggerEvent: string; createdAt: string; payload: Record<string, unknown> }).payload;
    }

    function getDeliveredWebhookEnvelope(): { triggerEvent: string; createdAt: string; payload: Record<string, unknown> } {
      const [, webhookPayload] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      return webhookPayload as { triggerEvent: string; createdAt: string; payload: Record<string, unknown> };
    }

    it("delivers PENDING status and BOOKING_REQUESTED triggerEvent in payload", async () => {
      const timestamp = "2024-06-15T10:00:00.000Z";
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-status-check",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "booking-uid-123",
        eventTypeId: 456,
        userId: 789,
        timestamp,
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(payload, "task-status");

      const envelope = getDeliveredWebhookEnvelope();
      expect(envelope.triggerEvent).toBe("BOOKING_REQUESTED");
      expect(envelope.createdAt).toBe(timestamp);

      const p = getDeliveredPayload();
      expect(p.status).toBe("PENDING");
    });

    it("includes eventTitle, eventDescription, requiresConfirmation, price, currency, and length from event type", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking({
          eventType: {
            id: 456,
            title: "Consultation Call",
            description: "30-minute consultation",
            requiresConfirmation: true,
            price: 5000,
            currency: "INR",
            length: 30,
          },
        }),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-evt-type",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
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
      expect(p.requiresConfirmation).toBe(true);
      expect(p.price).toBe(5000);
      expect(p.currency).toBe("INR");
      expect(p.length).toBe(30);
    });

    it("includes bookingId, title, location, organizer, and attendees from calendar event", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent({
          title: "My Booking",
          location: "https://cal.com/video/abc",
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
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-cal-evt",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-cal-evt"
      );

      const p = getDeliveredPayload();
      expect(p.bookingId).toBe(999);
      expect(p.title).toBe("My Booking");
      expect(p.location).toBe("https://cal.com/video/abc");
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

    it("normalizes response labels (name → your_name, email → email_address)", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent({
          responses: {
            name: { value: "Jane Doe", label: "name" },
            email: { value: "jane@example.com", label: "email" },
            location: { value: { optionValue: "", value: "https://cal.com/video/test" }, label: "location" },
          },
          userFieldsResponses: {},
        }),
        booking: createMockBooking(),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-responses",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-responses"
      );

      const p = getDeliveredPayload() as Record<string, unknown>;
      const responses = p.responses as Record<string, { label: string; value: unknown }>;

      expect(responses.name.label).toBe("your_name");
      expect(responses.name.value).toBe("Jane Doe");
      expect(responses.email.label).toBe("email_address");
      expect(responses.email.value).toBe("jane@example.com");
      expect(responses.location.label).toBe("location");
    });

    it("metadata is empty object when no metadata provided (no videoCallUrl for pending requests)", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-no-metadata",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-no-metadata"
      );

      const p = getDeliveredPayload();
      expect(p.metadata).toBeDefined();
      expect((p.metadata as Record<string, unknown>).videoCallUrl).toBeUndefined();
    });

    it("includes metadata.videoCallUrl when booking has metadata with videoCallUrl", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking({
          metadata: { videoCallUrl: "https://cal.com/video/abc123" },
        }),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-with-video-metadata",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-with-video-metadata"
      );

      const p = getDeliveredPayload();
      expect((p.metadata as Record<string, unknown>).videoCallUrl).toBe("https://cal.com/video/abc123");
    });

    it("derives attendee firstName and lastName from full name", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent({
          attendees: [
            {
              email: "john@example.com",
              name: "John Doe",
              timeZone: "UTC",
              language: { locale: "en" },
            },
            {
              email: "alice@example.com",
              name: "Alice",
              timeZone: "UTC",
              language: { locale: "en" },
            },
          ],
        }),
        booking: createMockBooking(),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-attendee-names",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-attendee-names"
      );

      const p = getDeliveredPayload();
      const attendees = p.attendees as Array<{ name: string; firstName: string; lastName: string }>;
      expect(attendees[0]).toMatchObject({ name: "John Doe", firstName: "John", lastName: "Doe" });
      expect(attendees[1]).toMatchObject({ name: "Alice", firstName: "Alice", lastName: "" });
    });

    it("uses booking.assignmentReason (legacy array) and does not leak evt.assignmentReason", async () => {
      const legacyReason = [{ reasonEnum: "ROUND_ROBIN", reasonString: "Round robin" }];

      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent({
          assignmentReason: { category: "round_robin", details: "from evt" },
        }),
        booking: createMockBooking({
          assignmentReason: legacyReason,
        }),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-assignment-reason",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-assignment-reason"
      );

      const p = getDeliveredPayload();
      expect(p.assignmentReason).toEqual(legacyReason);
    });

    it("defaults to price 0, currency usd, length null when event type fields are missing", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking({
          eventType: {
            id: 456,
            title: "Minimal Event",
            description: null,
            requiresConfirmation: true,
            price: undefined,
            currency: undefined,
            length: undefined,
          },
        }),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-defaults",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-defaults"
      );

      const p = getDeliveredPayload();
      expect(p.price).toBe(0);
      expect(p.currency).toBe("usd");
      expect(p.length).toBeNull();
    });

    it("includes destinationCalendar as null when not set", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent({ destinationCalendar: undefined }),
        booking: createMockBooking(),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-dest-cal",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-123",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-dest-cal"
      );

      const p = getDeliveredPayload();
      expect(p.destinationCalendar).toBeNull();
    });

    it("paid event payload has PENDING status and correct event type price/currency", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({
        calendarEvent: createMockCalendarEvent(),
        booking: createMockBooking({
          eventType: {
            id: 456,
            title: "Paid Consultation",
            description: "Paid event requiring confirmation",
            requiresConfirmation: true,
            price: 10000,
            currency: "USD",
            length: 60,
          },
        }),
      });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-paid-payload",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-uid-paid",
          eventTypeId: 456,
          userId: 789,
          timestamp: new Date().toISOString(),
        },
        "task-paid-payload"
      );

      const p = getDeliveredPayload();
      expect(p.status).toBe("PENDING");
      expect(p.eventTitle).toBe("Paid Consultation");
      expect(p.price).toBe(10000);
      expect(p.currency).toBe("USD");
      expect(p.requiresConfirmation).toBe(true);
    });
  });
});
