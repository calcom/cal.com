import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ILogger } from "../../interface/infrastructure";
import type { WebhookTasker } from "../../tasker/WebhookTasker";
import { WebhookTaskerProducerService } from "../WebhookTaskerProducerService";

/**
 * Unit Tests for WebhookTaskerProducerService
 *
 * Tests the lightweight Producer service for queueing webhook delivery tasks.
 */
describe("WebhookTaskerProducerService", () => {
  let producer: WebhookTaskerProducerService;
  let mockWebhookTasker: WebhookTasker;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Mock WebhookTasker
    mockWebhookTasker = {
      deliverWebhook: vi.fn().mockResolvedValue({ taskId: "task-id-123" }),
    } as unknown as WebhookTasker;

    // Mock Logger
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

  describe("queueBookingCreatedWebhook", () => {
    it("should queue a BOOKING_CREATED webhook task", async () => {
      await producer.queueBookingCreatedWebhook({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "booking-123",
        eventTypeId: 456,
        userId: 789,
      });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
          bookingUid: "booking-123",
          eventTypeId: 456,
          userId: 789,
          operationId: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it("should generate operationId if not provided", async () => {
      await producer.queueBookingCreatedWebhook({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "booking-123",
      });

      const callArgs = vi.mocked(mockWebhookTasker.deliverWebhook).mock.calls[0];
      const payload = callArgs[0];

      expect(payload).toHaveProperty("operationId");
      expect(payload.operationId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it("should use provided operationId", async () => {
      await producer.queueBookingCreatedWebhook({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "booking-123",
        operationId: "custom-op-id",
      });

      const callArgs = vi.mocked(mockWebhookTasker.deliverWebhook).mock.calls[0];
      const payload = callArgs[0];

      expect(payload.operationId).toBe("custom-op-id");
    });

    it("should log debug messages", async () => {
      await producer.queueBookingCreatedWebhook({
        bookingUid: "booking-123",
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Queueing booking webhook task",
        expect.objectContaining({
          operationId: expect.any(String),
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
          bookingUid: "booking-123",
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Webhook delivery task queued",
        expect.objectContaining({
          operationId: expect.any(String),
          taskId: "task-id-123",
        })
      );
    });
  });

  describe("queueBookingCancelledWebhook", () => {
    it("should queue a BOOKING_CANCELLED webhook task", async () => {
      await producer.queueBookingCancelledWebhook({
        bookingUid: "booking-456",
      });

      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
          bookingUid: "booking-456",
        })
      );
    });
  });

  describe("Metadata Support", () => {
    it("should include metadata if provided", async () => {
      await producer.queueBookingCreatedWebhook({
        bookingUid: "booking-123",
        metadata: { customField: "value" },
      });

      const callArgs = vi.mocked(mockWebhookTasker.deliverWebhook).mock.calls[0];
      const payload = callArgs[0];

      expect(payload.metadata).toEqual({ customField: "value" });
    });
  });

  describe("Error Handling", () => {
    it("should log and rethrow error if WebhookTasker fails", async () => {
      const error = new Error("WebhookTasker failed");
      vi.mocked(mockWebhookTasker.deliverWebhook).mockRejectedValueOnce(error);

      await expect(
        producer.queueBookingCreatedWebhook({
          bookingUid: "booking-123",
        })
      ).rejects.toThrow("WebhookTasker failed");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to queue webhook delivery task",
        expect.objectContaining({
          error: "WebhookTasker failed",
        })
      );
    });
  });

  describe("All Event-Specific Methods", () => {
    it("should have queueBookingCreatedWebhook", async () => {
      await producer.queueBookingCreatedWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_CREATED })
      );
    });

    it("should have queueBookingCancelledWebhook", async () => {
      await producer.queueBookingCancelledWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED })
      );
    });

    it("should have queueBookingRescheduledWebhook", async () => {
      await producer.queueBookingRescheduledWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED })
      );
    });

    it("should have queueBookingRequestedWebhook", async () => {
      await producer.queueBookingRequestedWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED })
      );
    });

    it("should have queueBookingRejectedWebhook", async () => {
      await producer.queueBookingRejectedWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_REJECTED })
      );
    });

    it("should have queueBookingPaymentInitiatedWebhook", async () => {
      await producer.queueBookingPaymentInitiatedWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED })
      );
    });

    it("should have queueBookingPaidWebhook", async () => {
      await producer.queueBookingPaidWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_PAID })
      );
    });

    it("should have queueBookingNoShowUpdatedWebhook", async () => {
      await producer.queueBookingNoShowUpdatedWebhook({
        bookingUid: "test-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED })
      );
    });

    it("should have queueFormSubmittedWebhook", async () => {
      await producer.queueFormSubmittedWebhook({
        formId: "form-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED })
      );
    });

    it("should have queueRecordingReadyWebhook", async () => {
      await producer.queueRecordingReadyWebhook({
        recordingId: "rec-123",
        bookingUid: "booking-123",
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.RECORDING_READY })
      );
    });

    it("should have queueOOOCreatedWebhook", async () => {
      await producer.queueOOOCreatedWebhook({
        oooEntryId: 123,
        userId: 456,
      });
      expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ triggerEvent: WebhookTriggerEvents.OOO_CREATED })
      );
    });
  });
});
