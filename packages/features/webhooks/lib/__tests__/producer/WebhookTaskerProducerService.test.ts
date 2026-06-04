import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ILogger } from "../../interface/infrastructure";
import type { WebhookTasker } from "../../tasker/WebhookTasker";
import { WebhookTaskerProducerService } from "../../service/WebhookTaskerProducerService";

/**
 * Unit Tests for WebhookTaskerProducerService
 *
 * Tests the lightweight Producer service for queueing webhook delivery tasks.
 * The producer has minimal dependencies (only Tasker and Logger) and queues
 * tasks to be processed by WebhookTaskConsumer.
 */
describe("WebhookTaskerProducerService", () => {
  let producer: WebhookTaskerProducerService;
  let mockWebhookTasker: WebhookTasker;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockWebhookTasker = {
      deliverWebhook: vi.fn().mockResolvedValue({ taskId: "mock-task-id" }),
    } as unknown as WebhookTasker;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    producer = new WebhookTaskerProducerService({
      webhookTasker: mockWebhookTasker,
      logger: mockLogger,
    });
  });

  describe("Constructor & Dependencies", () => {
    it("should be instantiable with Tasker and Logger", () => {
      expect(producer).toBeInstanceOf(WebhookTaskerProducerService);
    });

    it("should create sub-logger with prefix", () => {
      expect(mockLogger.getSubLogger).toHaveBeenCalledWith({
        prefix: ["[WebhookTaskerProducerService]"],
      });
    });
  });

  describe("queueBookingRequestedWebhook", () => {
    it("should queue a BOOKING_REQUESTED webhook task with required params", async () => {
      const params = {
        bookingUid: "booking-123",
        eventTypeId: 456,
        userId: 789,
      };

      await producer.queueBookingRequestedWebhook(params);

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-123",
          eventTypeId: 456,
          userId: 789,
        })
      );
    });

    it("should queue a BOOKING_REQUESTED webhook task with all optional params", async () => {
      const params = {
        bookingUid: "booking-123",
        eventTypeId: 456,
        userId: 789,
        teamId: 111,
        orgId: 222,
        oAuthClientId: "oauth-client-123",
        operationId: "custom-op-id",
        metadata: { customKey: "customValue" },
      };

      await producer.queueBookingRequestedWebhook(params);

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: "custom-op-id",
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-123",
          eventTypeId: 456,
          userId: 789,
          teamId: 111,
          orgId: 222,
          oAuthClientId: "oauth-client-123",
          metadata: { customKey: "customValue" },
        })
      );
    });

    it("should generate operationId if not provided", async () => {
      const params = {
        bookingUid: "booking-123",
      };

      await producer.queueBookingRequestedWebhook(params);

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: expect.any(String),
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-123",
          timestamp: expect.any(String),
        })
      );
    });

    it("should log debug message when queueing", async () => {
      const params = {
        bookingUid: "booking-123",
        eventTypeId: 456,
      };

      await producer.queueBookingRequestedWebhook(params);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Queueing booking webhook task",
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
          bookingUid: "booking-123",
          eventTypeId: 456,
        })
      );
    });

    it("should log and rethrow error if tasker fails", async () => {
      const error = new Error("Tasker error");
      vi.mocked(mockWebhookTasker.deliverWebhook).mockRejectedValueOnce(error);

      const params = {
        bookingUid: "booking-123",
      };

      await expect(producer.queueBookingRequestedWebhook(params)).rejects.toThrow("Tasker error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to queue webhook delivery task",
        expect.objectContaining({
          error: "Tasker error",
        })
      );
    });
  });

  describe("Other booking webhook methods", () => {
    it("should queue BOOKING_CREATED webhook", async () => {
      await producer.queueBookingCreatedWebhook({ bookingUid: "booking-123" });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
          bookingUid: "booking-123",
        })
      );
    });

    it("should queue BOOKING_CANCELLED webhook", async () => {
      await producer.queueBookingCancelledWebhook({ bookingUid: "booking-123" });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
          bookingUid: "booking-123",
        })
      );
    });

    it("should queue BOOKING_RESCHEDULED webhook", async () => {
      await producer.queueBookingRescheduledWebhook({ bookingUid: "booking-123" });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
          bookingUid: "booking-123",
        })
      );
    });

    it("should queue BOOKING_REJECTED webhook", async () => {
      await producer.queueBookingRejectedWebhook({ bookingUid: "booking-123" });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_REJECTED,
          bookingUid: "booking-123",
        })
      );
    });

    it("should queue BOOKING_NO_SHOW_UPDATED webhook", async () => {
      await producer.queueBookingNoShowUpdatedWebhook({ bookingUid: "booking-123" });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          bookingUid: "booking-123",
        })
      );
    });
  });

  describe("Payment webhook methods", () => {
    it("should queue BOOKING_PAYMENT_INITIATED webhook", async () => {
      await producer.queueBookingPaymentInitiatedWebhook({ bookingUid: "booking-123" });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
          bookingUid: "booking-123",
        })
      );
    });

    it("should queue BOOKING_PAID webhook", async () => {
      await producer.queueBookingPaidWebhook({ bookingUid: "booking-123" });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_PAID,
          bookingUid: "booking-123",
        })
      );
    });
  });
});
