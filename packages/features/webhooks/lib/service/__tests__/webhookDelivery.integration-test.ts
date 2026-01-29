import { prisma } from "@calcom/prisma";
import type { EventType, User, Webhook } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { v4 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import type { WebhookTaskPayload } from "../../types/webhookTask";

/**
 * Webhook Producer Integration Tests
 *
 * These tests verify that the WebhookTaskerProducerService correctly:
 * 1. Integrates with the DI container
 * 2. Calls WebhookTasker.deliverWebhook() with correct payloads
 *
 * Note: With the new WebhookTasker architecture:
 * - Async mode sends to trigger.dev (external service)
 * - Sync mode executes immediately via WebhookTaskConsumer
 *
 * Neither writes to the local Prisma Task table, so we mock
 * the WebhookTasker to verify the producer's behavior.
 */

// Track deliverWebhook calls
const deliveredWebhooks: WebhookTaskPayload[] = [];

// Mock the WebhookTasker module before importing the container
vi.mock("@calcom/features/webhooks/lib/tasker/WebhookTasker", () => ({
  WebhookTasker: class MockWebhookTasker {
    async deliverWebhook(payload: WebhookTaskPayload) {
      deliveredWebhooks.push(payload);
      return { taskId: `mock-task-${deliveredWebhooks.length}` };
    }
  },
}));

// Import after mocking
const { getWebhookProducer } = await import("@calcom/features/di/webhooks/containers/webhook");

describe("Webhook Producer Integration", () => {
  let testUser: User;
  let testEventType: EventType;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testWebhook: Webhook;

  // Use unique identifiers for each test run to avoid collisions
  const testId = v4();

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `webhook-producer-test-${testId}@example.com`,
        username: `webhook-producer-test-${testId}`,
        name: "Webhook Producer Test User",
      },
    });

    // Create test event type
    testEventType = await prisma.eventType.create({
      data: {
        title: "Webhook Producer Test Event",
        slug: `webhook-producer-test-event-${testId}`,
        length: 30,
        userId: testUser.id,
      },
    });

    // Create test webhook
    testWebhook = await prisma.webhook.create({
      data: {
        id: `webhook-producer-test-${testId}`,
        userId: testUser.id,
        subscriberUrl: "https://example.com/webhook",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        active: true,
      },
    });
  });

  beforeEach(() => {
    // Clear delivered webhooks before each test
    deliveredWebhooks.length = 0;
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.webhook.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.eventType.deleteMany({
      where: { id: testEventType.id },
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id },
    });
  });

  describe("BOOKING_CREATED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-created";

      await producer.queueBookingCreatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CREATED);
      expect(payload.bookingUid).toBe(bookingUid);
      expect(payload.eventTypeId).toBe(testEventType.id);
      expect(payload.userId).toBe(testUser.id);
      expect(payload.operationId).toBeDefined();
      expect(payload.timestamp).toBeDefined();

      // Verify trigger-specific fields from other triggers are NOT present
      expect(payload.cancelledBy).toBeUndefined();
      expect(payload.cancellationReason).toBeUndefined();
      expect(payload.rescheduleId).toBeUndefined();
      expect(payload.rescheduleUid).toBeUndefined();
      expect(payload.rejectionReason).toBeUndefined();
    });
  });

  describe("BOOKING_CANCELLED", () => {
    test("calls deliverWebhook with cancellation-specific fields", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-cancelled";
      const cancelledBy = "user@example.com";
      const cancellationReason = "Test cancellation reason";

      await producer.queueBookingCancelledWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        cancelledBy,
        cancellationReason,
        requestReschedule: false,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CANCELLED);
      expect(payload.bookingUid).toBe(bookingUid);
      expect(payload.cancelledBy).toBe(cancelledBy);
      expect(payload.cancellationReason).toBe(cancellationReason);
      expect(payload.requestReschedule).toBe(false);
    });
  });

  describe("BOOKING_RESCHEDULED", () => {
    test("calls deliverWebhook with reschedule-specific fields", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-rescheduled";
      const rescheduleData = {
        rescheduleId: 123,
        rescheduleUid: "original-booking-uid",
        rescheduleStartTime: "2024-01-01T10:00:00.000Z",
        rescheduleEndTime: "2024-01-01T11:00:00.000Z",
        rescheduledBy: "user@example.com",
      };

      await producer.queueBookingRescheduledWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        ...rescheduleData,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_RESCHEDULED);
      expect(payload.bookingUid).toBe(bookingUid);
      expect(payload.rescheduleId).toBe(rescheduleData.rescheduleId);
      expect(payload.rescheduleUid).toBe(rescheduleData.rescheduleUid);
      expect(payload.rescheduleStartTime).toBe(rescheduleData.rescheduleStartTime);
      expect(payload.rescheduleEndTime).toBe(rescheduleData.rescheduleEndTime);
      expect(payload.rescheduledBy).toBe(rescheduleData.rescheduledBy);
    });
  });

  describe("BOOKING_REQUESTED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-requested";

      await producer.queueBookingRequestedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_REQUESTED);
      expect(payload.bookingUid).toBe(bookingUid);
    });
  });

  describe("BOOKING_PAYMENT_INITIATED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-payment";

      await producer.queueBookingPaymentInitiatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED);
      expect(payload.bookingUid).toBe(bookingUid);
    });
  });

  describe("Team and Org context", () => {
    test("calls deliverWebhook with teamId and orgId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-team";
      const teamId = 456;
      const orgId = 789;

      await producer.queueBookingCreatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        teamId,
        orgId,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.teamId).toBe(teamId);
      expect(payload.orgId).toBe(orgId);
    });
  });

  describe("OAuth client context", () => {
    test("calls deliverWebhook with oAuthClientId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-oauth";
      const oAuthClientId = "oauth-client-123";

      await producer.queueBookingCreatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        oAuthClientId,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.oAuthClientId).toBe(oAuthClientId);
    });
  });
});
