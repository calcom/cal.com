import { prisma } from "@calcom/prisma";
import type { EventType, User, Webhook } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { v4 } from "uuid";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";

// Force async mode so tasks are written to DB (required for integration testing)
// This must be set before importing the webhook container
vi.stubEnv("ENABLE_ASYNC_TASKER", "true");
vi.stubEnv("TRIGGER_SECRET_KEY", "test-secret");
vi.stubEnv("TRIGGER_API_URL", "http://localhost:3030");

// Import after env vars are stubbed
const { getWebhookProducer } = await import("@calcom/features/di/webhooks/containers/webhook");

/**
 * Webhook Producer Integration Tests
 *
 * These tests verify that webhooks are correctly queued to the tasker.
 * Actual task processing and delivery is tested in tasker domain tests.
 */
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

  afterEach(async () => {
    // Clean up tasks after each test
    await prisma.task.deleteMany({
      where: { type: "webhookDelivery" },
    });
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.task.deleteMany({
      where: { type: "webhookDelivery" },
    });
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
    test("queues task with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-created";

      await producer.queueBookingCreatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      const tasks = await prisma.task.findMany({
        where: { type: "webhookDelivery" },
      });

      expect(tasks.length).toBe(1);
      expect(tasks[0].type).toBe("webhookDelivery");

      const payload = JSON.parse(tasks[0].payload);
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
    test("queues task with cancellation-specific fields", async () => {
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

      const tasks = await prisma.task.findMany({
        where: { type: "webhookDelivery" },
      });

      expect(tasks.length).toBe(1);

      const payload = JSON.parse(tasks[0].payload);
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CANCELLED);
      expect(payload.bookingUid).toBe(bookingUid);
      expect(payload.cancelledBy).toBe(cancelledBy);
      expect(payload.cancellationReason).toBe(cancellationReason);
      expect(payload.requestReschedule).toBe(false);
    });
  });

  describe("BOOKING_RESCHEDULED", () => {
    test("queues task with reschedule-specific fields", async () => {
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

      const tasks = await prisma.task.findMany({
        where: { type: "webhookDelivery" },
      });

      expect(tasks.length).toBe(1);

      const payload = JSON.parse(tasks[0].payload);
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
    test("queues task with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-requested";

      await producer.queueBookingRequestedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      const tasks = await prisma.task.findMany({
        where: { type: "webhookDelivery" },
      });

      expect(tasks.length).toBe(1);

      const payload = JSON.parse(tasks[0].payload);
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_REQUESTED);
      expect(payload.bookingUid).toBe(bookingUid);
    });
  });

  describe("BOOKING_PAYMENT_INITIATED", () => {
    test("queues task with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-payment";

      await producer.queueBookingPaymentInitiatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      const tasks = await prisma.task.findMany({
        where: { type: "webhookDelivery" },
      });

      expect(tasks.length).toBe(1);

      const payload = JSON.parse(tasks[0].payload);
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED);
      expect(payload.bookingUid).toBe(bookingUid);
    });
  });

  describe("Team and Org context", () => {
    test("queues task with teamId and orgId when provided", async () => {
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

      const tasks = await prisma.task.findMany({
        where: { type: "webhookDelivery" },
      });

      expect(tasks.length).toBe(1);

      const payload = JSON.parse(tasks[0].payload);
      expect(payload.teamId).toBe(teamId);
      expect(payload.orgId).toBe(orgId);
    });
  });

  describe("OAuth client context", () => {
    test("queues task with oAuthClientId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-oauth";
      const oAuthClientId = "oauth-client-123";

      await producer.queueBookingCreatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        oAuthClientId,
      });

      const tasks = await prisma.task.findMany({
        where: { type: "webhookDelivery" },
      });

      expect(tasks.length).toBe(1);

      const payload = JSON.parse(tasks[0].payload);
      expect(payload.oAuthClientId).toBe(oAuthClientId);
    });
  });
});
