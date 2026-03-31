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
 * BOOKING_NO_SHOW_UPDATED Trigger Tests
 *
 * Tests specific to the BOOKING_NO_SHOW_UPDATED webhook trigger.
 * This trigger fires when a booking attendee is marked as no-show.
 *
 * Scenarios covered:
 * - No-show attendee PII resolved from DB via attendeeIds (no PII in queue)
 * - DTO built with correct fields (message, attendees, bookingUid, bookingId)
 * - Missing metadata fields handled gracefully
 * - Team/org context passed through subscriber lookup
 * - Platform fields (oAuthClientId) forwarded
 * - Integration: real PayloadBuilder verifies delivered payload shape
 */
describe("BOOKING_NO_SHOW_UPDATED Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockBookingDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const defaultSubscriber = {
    id: "sub-noshow-1",
    subscriberUrl: "https://example.com/webhook",
    payloadTemplate: null,
    appId: null,
    secret: "webhook-secret",
    time: null,
    timeUnit: null,
    eventTriggers: [WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED],
    version: WebhookVersion.V_2021_10_20,
  };

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
      fetchEventData: vi.fn().mockResolvedValue({ data: {
        noShowMessage: "attendee@example.com x_marked_as_no_show",
        noShowAttendees: [{ email: "attendee@example.com", noShow: true }],
        bookingId: 42,
        bookingUid: "no-show-uid",
      } }),
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
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          createdAt: new Date().toISOString(),
          payload: {
            bookingUid: "no-show-uid",
            bookingId: 42,
            attendees: [{ email: "attendee@example.com", noShow: true }],
            message: "attendee@example.com x_marked_as_no_show",
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

  describe("No-show attendee marking", () => {
    it("should process BOOKING_NO_SHOW_UPDATED and deliver webhook", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-1",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "no-show-uid",
        eventTypeId: 100,
        userId: 5,
        metadata: {
          attendeeIds: [1],
          bookingId: 42,
        },
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-1");

      expect(mockBookingDataFetcher.canHandle).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED
      );
      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            subscriberUrl: "https://example.com/webhook",
          }),
        ])
      );
    });

    it("should not call processWebhooks when no subscribers found", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-no-subs",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "no-show-uid",
        eventTypeId: 100,
        userId: 5,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([]);

      await consumer.processWebhookTask(payload, "task-noshow-no-subs");

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should not call processWebhooks when fetchEventData returns null", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-null-data",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "no-show-uid",
        eventTypeId: 100,
        userId: 5,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({ data: null });

      await consumer.processWebhookTask(payload, "task-noshow-null-data");

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });

  describe("Team/Org context", () => {
    it("should pass teamId and orgId to subscriber context lookup", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-team",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "no-show-uid",
        eventTypeId: 100,
        userId: 5,
        teamId: 10,
        orgId: 20,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-team");

      expect(mockBookingDataFetcher.getSubscriberContext).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 10,
          orgId: 20,
        })
      );
      expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
    });
  });

  describe("Platform fields", () => {
    it("should pass oAuthClientId through the task payload", async () => {
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-platform",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "no-show-uid",
        eventTypeId: 100,
        userId: 5,
        oAuthClientId: "platform-client-123",
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-noshow-platform");

      expect(mockBookingDataFetcher.fetchEventData).toHaveBeenCalledWith(
        expect.objectContaining({
          oAuthClientId: "platform-client-123",
        })
      );
    });
  });

  describe("Integration: real PayloadBuilder verifies webhook payload content", () => {
    const realPayloadBuilderFactory = createPayloadBuilderFactory();

    function buildConsumerWithRealBuilder() {
      return new WebhookTaskConsumer(
        mockWebhookRepository,
        [mockBookingDataFetcher],
        realPayloadBuilderFactory,
        mockWebhookService,
        mockLogger
      );
    }

    function getDeliveredWebhookEnvelope(): {
      triggerEvent: string;
      createdAt: string;
      payload: Record<string, unknown>;
    } {
      const [, webhookPayload] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      return webhookPayload as { triggerEvent: string; createdAt: string; payload: Record<string, unknown> };
    }

    function getDeliveredPayload(): Record<string, unknown> {
      return getDeliveredWebhookEnvelope().payload;
    }

    it("delivers BOOKING_NO_SHOW_UPDATED triggerEvent and correct timestamp", async () => {
      const timestamp = "2024-06-15T10:00:00.000Z";
      const payload: BookingWebhookTaskPayload = {
        operationId: "op-noshow-integration",
        triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        bookingUid: "no-show-uid",
        eventTypeId: 100,
        userId: 5,
        timestamp,
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(payload, "task-noshow-integration");

      const envelope = getDeliveredWebhookEnvelope();
      expect(envelope.triggerEvent).toBe("BOOKING_NO_SHOW_UPDATED");
      expect(envelope.createdAt).toBe(timestamp);
    });

    it("includes message, bookingUid, bookingId, and attendees in payload", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-noshow-fields",
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "no-show-uid",
          eventTypeId: 100,
          userId: 5,
          timestamp: new Date().toISOString(),
        },
        "task-noshow-fields"
      );

      const p = getDeliveredPayload();
      expect(p.message).toBe("attendee@example.com x_marked_as_no_show");
      expect(p.bookingUid).toBe("no-show-uid");
      expect(p.bookingId).toBe(42);
      expect(p.attendees).toEqual([{ email: "attendee@example.com", noShow: true }]);
    });

    it("handles multiple attendees marked as no-show", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({ data: {
        noShowMessage: "2 attendees marked as no-show",
        noShowAttendees: [
          { email: "attendee1@example.com", noShow: true },
          { email: "attendee2@example.com", noShow: true },
        ],
        bookingId: 99,
        bookingUid: "multi-noshow-uid",
      } });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-noshow-multi",
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "multi-noshow-uid",
          eventTypeId: 100,
          userId: 5,
          timestamp: new Date().toISOString(),
        },
        "task-noshow-multi"
      );

      const p = getDeliveredPayload();
      expect(p.attendees).toEqual([
        { email: "attendee1@example.com", noShow: true },
        { email: "attendee2@example.com", noShow: true },
      ]);
      expect(p.bookingId).toBe(99);
    });

    it("does not deliver webhook when DTO build returns null due to missing data", async () => {
      vi.mocked(mockBookingDataFetcher.fetchEventData).mockResolvedValueOnce({ data: {
        noShowMessage: undefined,
        noShowAttendees: undefined,
        bookingUid: undefined,
      } });

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-noshow-missing",
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "no-show-uid",
          eventTypeId: 100,
          userId: 5,
          timestamp: new Date().toISOString(),
        },
        "task-noshow-missing"
      );

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });
});
