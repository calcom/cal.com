import { describe, it, expect, vi, beforeEach } from "vitest";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { IWebhookRepository } from "../../interface/repository";
import type { ILogger } from "../../interface/infrastructure";
import { WebhookTaskConsumer } from "../WebhookTaskConsumer";
import type { WebhookTaskPayload } from "../../types/webhookTask";

/**
 * Unit Tests for WebhookTaskConsumer
 * 
 * Tests the heavy Consumer service for processing webhook delivery tasks.
 * 
 * Note: Phase 0 tests basic scaffold. Full tests will be added when
 * Consumer implementation is complete (data fetching, payload building, HTTP delivery).
 */
describe("WebhookTaskConsumer", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Mock Repository
    mockWebhookRepository = {
      getSubscribers: vi.fn().mockResolvedValue([]),
      getWebhookById: vi.fn(),
      findByWebhookId: vi.fn(),
      findByOrgIdAndTrigger: vi.fn(),
      getFilteredWebhooksForUser: vi.fn(),
    } as unknown as IWebhookRepository;

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    consumer = new WebhookTaskConsumer(mockWebhookRepository, mockLogger);
  });

  describe("Constructor & Dependencies", () => {
    it("should be instantiable with Repository and Logger", () => {
      expect(consumer).toBeInstanceOf(WebhookTaskConsumer);
    });

    it("should create sub-logger with prefix", () => {
      expect(mockLogger.getSubLogger).toHaveBeenCalledWith({
        prefix: ["[WebhookTaskConsumer]"],
      });
    });
  });

  describe("processWebhookTask - Basic Flow", () => {
    it("should process a webhook task with no subscribers", async () => {
      const payload: WebhookTaskPayload = {
        operationId: "op-123",
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "booking-123",
        eventTypeId: 456,
        userId: 789,
        timestamp: new Date().toISOString(),
      };

      await consumer.processWebhookTask(payload, "task-123");

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Processing webhook delivery task",
        expect.objectContaining({
          operationId: "op-123",
          taskId: "task-123",
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        })
      );

      expect(mockWebhookRepository.getSubscribers).toHaveBeenCalledWith({
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        userId: 789,
        eventTypeId: 456,
        teamId: undefined,
        orgId: undefined,
        oAuthClientId: undefined,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "No webhook subscribers found",
        expect.objectContaining({
          operationId: "op-123",
        })
      );
    });

    it("should fetch subscribers based on task payload", async () => {
      const payload: WebhookTaskPayload = {
        operationId: "op-456",
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        bookingUid: "booking-456",
        eventTypeId: 789,
        teamId: 111,
        orgId: 222,
        oAuthClientId: "oauth-client-123",
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
        {
          id: "sub-1",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: "secret",
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CANCELLED],
        },
      ]);

      await consumer.processWebhookTask(payload, "task-456");

      expect(mockWebhookRepository.getSubscribers).toHaveBeenCalledWith({
        triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED,
        userId: undefined, // Not in payload
        eventTypeId: 789,
        teamId: 111,
        orgId: 222,
        oAuthClientId: "oauth-client-123",
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Found 1 webhook subscriber(s)",
        expect.objectContaining({
          operationId: "op-456",
        })
      );
    });
  });

  describe("processWebhookTask - Event Type Routing", () => {
    const testCases = [
      {
        trigger: WebhookTriggerEvents.BOOKING_CREATED,
        requiredField: "bookingUid",
      },
      {
        trigger: WebhookTriggerEvents.FORM_SUBMITTED,
        requiredField: "formId",
      },
      {
        trigger: WebhookTriggerEvents.RECORDING_READY,
        requiredField: "recordingId",
      },
      {
        trigger: WebhookTriggerEvents.OOO_CREATED,
        requiredField: "oooEntryId",
      },
    ];

    testCases.forEach(({ trigger, requiredField }) => {
      it(`should process ${trigger} event type (scaffold)`, async () => {
        const payload: WebhookTaskPayload = {
          operationId: "op-test",
          triggerEvent: trigger,
          [requiredField]: "test-id",
          timestamp: new Date().toISOString(),
        };

        // Mock subscriber so we reach data fetching
        vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([
          {
            id: "sub-1",
            subscriberUrl: "https://example.com/webhook",
            payloadTemplate: null,
            appId: null,
            secret: null,
            time: null,
            timeUnit: null,
            eventTriggers: [trigger],
          },
        ]);

        // Should not throw - scaffold implementation logs debug messages
        await expect(consumer.processWebhookTask(payload, "task-test")).resolves.not.toThrow();

        // Verify subscriber fetch was called
        expect(mockWebhookRepository.getSubscribers).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should log and rethrow error if repository fails", async () => {
      const error = new Error("Repository error");
      vi.mocked(mockWebhookRepository.getSubscribers).mockRejectedValueOnce(error);

      const payload: WebhookTaskPayload = {
        operationId: "op-error",
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        bookingUid: "booking-123",
        timestamp: new Date().toISOString(),
      };

      await expect(consumer.processWebhookTask(payload, "task-error")).rejects.toThrow(
        "Repository error"
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to process webhook delivery task",
        expect.objectContaining({
          operationId: "op-error",
          taskId: "task-error",
          error: "Repository error",
        })
      );
    });

    it("should warn if event data not found", async () => {
      const payload: WebhookTaskPayload = {
        operationId: "op-missing",
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        // Missing bookingUid
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
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        },
      ]);

      await consumer.processWebhookTask(payload, "task-missing");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Event data not found",
        expect.objectContaining({
          operationId: "op-missing",
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        })
      );
    });
  });

  describe("Phase 0 Scaffold - Pending Implementation", () => {
    it("TODO: Implement full data fetching for booking events", () => {
      // Pending: Inject BookingRepository
      // Pending: Implement fetchBookingData()
      // Pending: Fetch booking, eventType, user, attendees
      expect(true).toBe(true); // Placeholder
    });

    it("TODO: Implement payload building with PayloadBuilders", () => {
      // Pending: Inject PayloadBuilders
      // Pending: Build versioned payloads
      // Pending: Apply payload templates
      expect(true).toBe(true); // Placeholder
    });

    it("TODO: Implement HTTP delivery to subscriber URLs", () => {
      // Pending: Inject HTTP client
      // Pending: Send webhook to subscriber.subscriberUrl
      // Pending: Handle retries, timeouts, errors
      expect(true).toBe(true); // Placeholder
    });

    it("TODO: Implement integration test for full flow", () => {
      // Pending: Producer → Tasker → Consumer → HTTP delivery
      // Pending: Verify webhook received by mock server
      // Pending: Test retry logic
      expect(true).toBe(true); // Placeholder
    });
  });
});
