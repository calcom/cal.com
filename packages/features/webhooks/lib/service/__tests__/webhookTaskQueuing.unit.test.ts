/**
 * Unit Tests for Webhook Task Queuing
 *
 * These tests verify that webhook tasks are correctly queued via the producer.
 * They use a mocked Tasker (infrastructure boundary) while testing the real
 * WebhookTaskerProducerService.
 *
 * This pattern can be used as a template for testing any service that queues webhooks.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import {
  createMockLogger,
  createMockTasker,
  expectWebhookTaskQueued,
  expectWebhookTaskNotQueued,
  expectWebhookTasksQueuedCount,
  getQueuedWebhookTasks,
} from "@calcom/testing/lib/mocks/index";

import { WebhookTaskerProducerService } from "../WebhookTaskerProducerService";

describe("Webhook Task Queuing - Unit Tests", () => {
  let mockTasker: ReturnType<typeof createMockTasker>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let webhookProducer: WebhookTaskerProducerService;

  beforeEach(() => {
    mockTasker = createMockTasker();
    mockLogger = createMockLogger();
    webhookProducer = new WebhookTaskerProducerService(mockTasker, mockLogger);
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

      expectWebhookTaskQueued(mockTasker, {
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

      const tasks = getQueuedWebhookTasks(mockTasker);
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
        cancellationReason: "Schedule conflict",
      });

      expectWebhookTaskQueued(mockTasker, {
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        bookingUid: "booking-789",
        cancelledBy: "user@example.com",
        cancellationReason: "Schedule conflict",
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

      expectWebhookTaskQueued(mockTasker, {
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

      expectWebhookTaskQueued(mockTasker, {
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

      expectWebhookTasksQueuedCount(mockTasker, 3);

      const tasks = getQueuedWebhookTasks(mockTasker);
      expect(tasks[0].bookingUid).toBe("booking-1");
      expect(tasks[1].bookingUid).toBe("booking-2");
      expect(tasks[2].bookingUid).toBe("booking-3");
    });

    it("should not queue tasks when nothing is called", () => {
      expectWebhookTaskNotQueued(mockTasker);
    });

    it("should only queue specific trigger events", async () => {
      await webhookProducer.queueBookingCreatedWebhook({ bookingUid: "booking-1" });

      expectWebhookTaskNotQueued(mockTasker, WebhookTriggerEvents.BOOKING_CANCELLED);
      expectWebhookTaskNotQueued(mockTasker, WebhookTriggerEvents.BOOKING_RESCHEDULED);
    });
  });

  describe("OAuth client support", () => {
    it("should include oAuthClientId when provided", async () => {
      await webhookProducer.queueBookingCreatedWebhook({
        bookingUid: "oauth-booking",
        oAuthClientId: "oauth-client-123",
      });

      expectWebhookTaskQueued(mockTasker, {
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "oauth-booking",
        oAuthClientId: "oauth-client-123",
      });
    });
  });
});
