import { prisma } from "@calcom/prisma";
import type { EventType, User, Webhook } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { v4 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { WebhookTaskPayload } from "../types/webhookTask";

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
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_REQUESTED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });
  });
});
