/**
 * Unit Tests for Webhook Task Queuing
 *
 * These tests verify that webhook tasks are correctly queued via the producer.
 * They use a mocked WebhookTasker (infrastructure boundary) while testing the real
 * WebhookTaskerProducerService.
 *
 * This pattern can be used as a template for testing any service that queues webhooks.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { createMockLogger } from "@calcom/testing/lib/mocks/index";

import type { WebhookTaskPayload } from "../../types/webhookTask";
import { WebhookTaskerProducerService } from "../WebhookTaskerProducerService";

function createMockWebhookTasker() {
  return {
    deliverWebhook: vi.fn().mockResolvedValue({ taskId: "mock-task-id" }),
  };
}

function expectWebhookDeliveryQueued(
  mockWebhookTasker: ReturnType<typeof createMockWebhookTasker>,
  expected: Partial<WebhookTaskPayload>
) {
  expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledWith(expect.objectContaining(expected));
}

function expectWebhookDeliveryNotQueued(
  mockWebhookTasker: ReturnType<typeof createMockWebhookTasker>,
  triggerEvent?: WebhookTriggerEvents
) {
  if (triggerEvent) {
    const calls = mockWebhookTasker.deliverWebhook.mock.calls as unknown as [WebhookTaskPayload][];
    const matching = calls.filter(([payload]) => payload.triggerEvent === triggerEvent);
    expect(matching).toHaveLength(0);
  } else {
    expect(mockWebhookTasker.deliverWebhook).not.toHaveBeenCalled();
  }
}

function expectWebhookDeliveriesCount(
  mockWebhookTasker: ReturnType<typeof createMockWebhookTasker>,
  count: number
) {
  expect(mockWebhookTasker.deliverWebhook).toHaveBeenCalledTimes(count);
}

function getQueuedWebhookPayloads(mockWebhookTasker: ReturnType<typeof createMockWebhookTasker>) {
  return (mockWebhookTasker.deliverWebhook.mock.calls as unknown as [WebhookTaskPayload][]).map(
    ([payload]) => payload
  );
}

describe("Webhook Task Queuing - Unit Tests", () => {
  let mockWebhookTasker: ReturnType<typeof createMockWebhookTasker>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let webhookProducer: WebhookTaskerProducerService;

  beforeEach(() => {
    mockWebhookTasker = createMockWebhookTasker();
    mockLogger = createMockLogger();
    webhookProducer = new WebhookTaskerProducerService({
      webhookTasker: mockWebhookTasker as never,
      logger: mockLogger,
    });
  });

  describe("BOOKING_CREATED webhook", () => {
    it("should queue task with correct trigger event and booking data", async () => {
      await webhookProducer.queueBookingCreatedWebhook({
        bookingUid: "booking-123",
        eventTypeId: 10,
        userId: 5,
        teamId: 100,
        orgId: 200,
      });

      expectWebhookDeliveryQueued(mockWebhookTasker, {
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "booking-123",
        eventTypeId: 10,
        userId: 5,
        teamId: 100,
        orgId: 200,
      });
    });

    it("should include operationId and timestamp in payload", async () => {
      await webhookProducer.queueBookingCreatedWebhook({
        bookingUid: "booking-456",
      });

      const tasks = getQueuedWebhookPayloads(mockWebhookTasker);
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toHaveProperty("operationId");
      expect(tasks[0]).toHaveProperty("timestamp");
    });
  });

  describe("BOOKING_CANCELLED webhook", () => {
    it("should queue task with cancellation-specific fields", async () => {
      await webhookProducer.queueBookingCancelledWebhook({
        bookingUid: "booking-789",
        eventTypeId: 15,
        userId: 8,
        cancelledBy: "user@example.com",
      });

      expectWebhookDeliveryQueued(mockWebhookTasker, {
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        bookingUid: "booking-789",
        cancelledBy: "user@example.com",
      });
    });
  });

  describe("BOOKING_RESCHEDULED webhook", () => {
    it("should queue task with reschedule-specific fields", async () => {
      await webhookProducer.queueBookingRescheduledWebhook({
        bookingUid: "booking-new",
        eventTypeId: 20,
        userId: 10,
        rescheduleId: 999,
        rescheduleUid: "booking-old",
      });

      expectWebhookDeliveryQueued(mockWebhookTasker, {
        triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED,
        bookingUid: "booking-new",
        rescheduleId: 999,
        rescheduleUid: "booking-old",
      });
    });
  });

  describe("BOOKING_REQUESTED webhook", () => {
    it("should queue task for bookings requiring confirmation", async () => {
      await webhookProducer.queueBookingRequestedWebhook({
        bookingUid: "pending-booking",
        eventTypeId: 25,
        userId: 12,
      });

      expectWebhookDeliveryQueued(mockWebhookTasker, {
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "pending-booking",
      });
    });
  });

  describe("Multiple webhook scenarios", () => {
    it("should track multiple queued tasks", async () => {
      await webhookProducer.queueBookingCreatedWebhook({ bookingUid: "booking-1" });
      await webhookProducer.queueBookingCreatedWebhook({ bookingUid: "booking-2" });
      await webhookProducer.queueBookingCancelledWebhook({ bookingUid: "booking-3" });

      expectWebhookDeliveriesCount(mockWebhookTasker, 3);

      const tasks = getQueuedWebhookPayloads(mockWebhookTasker);
      expect(tasks[0].bookingUid).toBe("booking-1");
      expect(tasks[1].bookingUid).toBe("booking-2");
      expect(tasks[2].bookingUid).toBe("booking-3");
    });

    it("should not queue tasks when nothing is called", () => {
      expectWebhookDeliveryNotQueued(mockWebhookTasker);
    });

    it("should only queue specific trigger events", async () => {
      await webhookProducer.queueBookingCreatedWebhook({ bookingUid: "booking-1" });

      expectWebhookDeliveryNotQueued(mockWebhookTasker, WebhookTriggerEvents.BOOKING_CANCELLED);
      expectWebhookDeliveryNotQueued(mockWebhookTasker, WebhookTriggerEvents.BOOKING_RESCHEDULED);
    });
  });

  describe("OAuth client support", () => {
    it("should include oAuthClientId when provided", async () => {
      await webhookProducer.queueBookingCreatedWebhook({
        bookingUid: "oauth-booking",
        oAuthClientId: "oauth-client-123",
      });

      expectWebhookDeliveryQueued(mockWebhookTasker, {
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "oauth-booking",
        oAuthClientId: "oauth-client-123",
      });
    });
  });
});
