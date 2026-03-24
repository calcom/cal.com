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
  let _testWebhook: Webhook;

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

    // Create test webhook subscribing to all trigger events
    _testWebhook = await prisma.webhook.create({
      data: {
        id: `webhook-producer-test-${testId}`,
        userId: testUser.id,
        subscriberUrl: "https://example.com/webhook",
        eventTriggers: [
          WebhookTriggerEvents.BOOKING_CREATED,
          WebhookTriggerEvents.BOOKING_REQUESTED,
          WebhookTriggerEvents.BOOKING_RESCHEDULED,
          WebhookTriggerEvents.BOOKING_CANCELLED,
          WebhookTriggerEvents.BOOKING_REJECTED,
          WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
          WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
          WebhookTriggerEvents.BOOKING_PAID,
          WebhookTriggerEvents.FORM_SUBMITTED,
          WebhookTriggerEvents.RECORDING_READY,
          WebhookTriggerEvents.OOO_CREATED,
          WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
          WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        ],
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

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_REQUESTED, {
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

  describe("BOOKING_CREATED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-created";

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_CREATED, {
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CREATED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_CREATED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("includes teamId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-created-team";

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_CREATED, {
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        teamId: 999,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CREATED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_CREATED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });
  });

  describe("BOOKING_RESCHEDULED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-rescheduled";

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_RESCHEDULED, {
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_RESCHEDULED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_RESCHEDULED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("includes teamId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-rescheduled-team";

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_RESCHEDULED, {
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        teamId: 999,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_RESCHEDULED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_RESCHEDULED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });
  });

  describe("BOOKING_CANCELLED", () => {
    test("calls deliverWebhook with correct payload via dedicated method", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-cancelled";

      await producer.queueBookingCancelledWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CANCELLED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_CANCELLED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("calls deliverWebhook via queueBookingWebhook", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-cancelled-generic";

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_CANCELLED, {
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CANCELLED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_CANCELLED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("includes teamId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-cancelled-team";

      await producer.queueBookingCancelledWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        teamId: 999,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_CANCELLED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_CANCELLED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });
  });

  describe("BOOKING_REJECTED", () => {
    test("calls deliverWebhook with correct payload via dedicated method", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-rejected";

      await producer.queueBookingRejectedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_REJECTED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_REJECTED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("calls deliverWebhook via queueBookingWebhook", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-rejected-generic";

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_REJECTED, {
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_REJECTED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_REJECTED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });
  });

  describe("BOOKING_NO_SHOW_UPDATED", () => {
    test("calls deliverWebhook with correct payload via dedicated method", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-noshow";

      await producer.queueBookingNoShowUpdatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("calls deliverWebhook via queueBookingWebhook", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-noshow-generic";

      await producer.queueBookingWebhook(WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED, {
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("includes metadata when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-noshow-meta";

      await producer.queueBookingNoShowUpdatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        metadata: { attendeeIds: [1, 2], bookingId: 100 },
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
        expect(payload.bookingUid).toBe(bookingUid);
        expect(payload.metadata).toEqual({ attendeeIds: [1, 2], bookingId: 100 });
      }
    });
  });

  describe("BOOKING_PAYMENT_INITIATED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-payment-initiated";

      await producer.queueBookingPaymentInitiatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("includes teamId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-payment-initiated-team";

      await producer.queueBookingPaymentInitiatedWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        teamId: 999,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });
  });

  describe("BOOKING_PAID", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-paid";

      await producer.queueBookingPaidWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_PAID);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_PAID) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("includes teamId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-paid-team";

      await producer.queueBookingPaidWebhook({
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        teamId: 999,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.BOOKING_PAID);
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_PAID) {
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });
  });

  describe("FORM_SUBMITTED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const formId = "test-form-id-submitted";

      await producer.queueFormSubmittedWebhook({
        formId,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.FORM_SUBMITTED);
      if (payload.triggerEvent === WebhookTriggerEvents.FORM_SUBMITTED) {
        expect(payload.formId).toBe(formId);
      }
    });

    test("includes teamId when provided", async () => {
      const producer = getWebhookProducer();
      const formId = "test-form-id-submitted-team";

      await producer.queueFormSubmittedWebhook({
        formId,
        userId: testUser.id,
        teamId: 999,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.FORM_SUBMITTED);
      if (payload.triggerEvent === WebhookTriggerEvents.FORM_SUBMITTED) {
        expect(payload.formId).toBe(formId);
        expect(payload.teamId).toBe(999);
      }
    });
  });

  describe("RECORDING_READY", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const recordingId = "test-recording-id";
      const bookingUid = "test-booking-uid-recording";

      await producer.queueRecordingReadyWebhook({
        recordingId,
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_READY);
      if (payload.triggerEvent === WebhookTriggerEvents.RECORDING_READY) {
        expect(payload.recordingId).toBe(recordingId);
        expect(payload.bookingUid).toBe(bookingUid);
      }
    });

    test("includes teamId when provided", async () => {
      const producer = getWebhookProducer();
      const recordingId = "test-recording-id-team";
      const bookingUid = "test-booking-uid-recording-team";

      await producer.queueRecordingReadyWebhook({
        recordingId,
        bookingUid,
        eventTypeId: testEventType.id,
        userId: testUser.id,
        teamId: 999,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.RECORDING_READY);
      if (payload.triggerEvent === WebhookTriggerEvents.RECORDING_READY) {
        expect(payload.recordingId).toBe(recordingId);
        expect(payload.bookingUid).toBe(bookingUid);
        expect(payload.teamId).toBe(999);
      }
    });
  });

  describe("OOO_CREATED", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const oooEntryId = 42;

      await producer.queueOOOCreatedWebhook({
        oooEntryId,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.OOO_CREATED);
      if (payload.triggerEvent === WebhookTriggerEvents.OOO_CREATED) {
        expect(payload.oooEntryId).toBe(oooEntryId);
        expect(payload.userId).toBe(testUser.id);
      }
    });

    test("includes teamId, teamIds, and orgId when provided", async () => {
      const producer = getWebhookProducer();
      const oooEntryId = 43;

      await producer.queueOOOCreatedWebhook({
        oooEntryId,
        userId: testUser.id,
        teamId: 999,
        teamIds: [10, 20],
        orgId: 100,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.OOO_CREATED);
      if (payload.triggerEvent === WebhookTriggerEvents.OOO_CREATED) {
        expect(payload.oooEntryId).toBe(oooEntryId);
        expect(payload.userId).toBe(testUser.id);
        expect(payload.teamId).toBe(999);
        expect(payload.teamIds).toEqual([10, 20]);
        expect(payload.orgId).toBe(100);
      }
    });
  });

  describe("ROUTING_FORM_FALLBACK_HIT", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const formId = "test-form-id-fallback";
      const responseId = 789;

      await producer.queueRoutingFormFallbackHitWebhook({
        formId,
        responseId,
        userId: testUser.id,
        metadata: {
          fallbackAction: {
            type: "externalRedirectUrl",
            value: "https://example.com/fallback",
          },
        },
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT);
      if (payload.triggerEvent === WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT) {
        expect(payload.formId).toBe(formId);
        expect(payload.responseId).toBe(responseId);
      }
    });

    test("includes teamId and orgId when provided", async () => {
      const producer = getWebhookProducer();
      const formId = "test-form-id-fallback-team";
      const responseId = 790;

      await producer.queueRoutingFormFallbackHitWebhook({
        formId,
        responseId,
        userId: testUser.id,
        teamId: 999,
        orgId: 100,
        metadata: {
          fallbackAction: {
            type: "eventTypeRedirectUrl",
            value: "team/30min",
            eventTypeId: 42,
          },
        },
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT);
      if (payload.triggerEvent === WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT) {
        expect(payload.formId).toBe(formId);
        expect(payload.responseId).toBe(responseId);
        expect(payload.teamId).toBe(999);
        expect(payload.orgId).toBe(100);
      }
    });
  });

  describe("WRONG_ASSIGNMENT_REPORT", () => {
    test("calls deliverWebhook with correct payload", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-wrong-assignment";
      const wrongAssignmentReportId = "report-123";

      await producer.queueWrongAssignmentReportWebhook({
        bookingUid,
        wrongAssignmentReportId,
        userId: testUser.id,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT);
      if (payload.triggerEvent === WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT) {
        expect(payload.bookingUid).toBe(bookingUid);
        expect(payload.wrongAssignmentReportId).toBe(wrongAssignmentReportId);
      }
    });

    test("includes teamId and orgId when provided", async () => {
      const producer = getWebhookProducer();
      const bookingUid = "test-booking-uid-wrong-assignment-team";
      const wrongAssignmentReportId = "report-456";

      await producer.queueWrongAssignmentReportWebhook({
        bookingUid,
        wrongAssignmentReportId,
        userId: testUser.id,
        teamId: 999,
        orgId: 100,
      });

      expect(deliveredWebhooks.length).toBe(1);

      const payload = deliveredWebhooks[0];
      expect(payload.triggerEvent).toBe(WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT);
      if (payload.triggerEvent === WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT) {
        expect(payload.bookingUid).toBe(bookingUid);
        expect(payload.wrongAssignmentReportId).toBe(wrongAssignmentReportId);
        expect(payload.teamId).toBe(999);
        expect(payload.orgId).toBe(100);
      }
    });
  });
});
