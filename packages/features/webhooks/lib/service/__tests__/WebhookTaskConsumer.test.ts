import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IWebhookDataFetcher } from "../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../interface/IWebhookRepository";
import { WebhookVersion } from "../../interface/IWebhookRepository";
import type { ILogger } from "../../interface/infrastructure";
import type { WebhookTaskPayload } from "../../types/webhookTask";
import { WebhookTaskConsumer } from "../WebhookTaskConsumer";

/**
 * Unit Tests for WebhookTaskConsumer
 *
 * Tests the heavy Consumer service for processing webhook delivery tasks.
 *
 */
describe("WebhookTaskConsumer", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockDataFetchers: IWebhookDataFetcher[];
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

    // Mock Data Fetchers (Strategy Pattern implementations)
    const createMockFetcher = (triggerEvents: string[]): IWebhookDataFetcher => ({
      canHandle: vi.fn((event) => triggerEvents.includes(event)),
      fetchEventData: vi.fn().mockResolvedValue({ _scaffold: true }),
      getSubscriberContext: vi.fn((payload: WebhookTaskPayload) => ({
        triggerEvent: payload.triggerEvent,
        userId: "userId" in payload ? payload.userId : undefined,
        eventTypeId: "eventTypeId" in payload ? payload.eventTypeId : undefined,
        teamId: "teamId" in payload ? payload.teamId : undefined,
        orgId: "orgId" in payload ? payload.orgId : undefined,
        oAuthClientId: "oAuthClientId" in payload ? payload.oAuthClientId : undefined,
      })),
    });

    mockDataFetchers = [
      createMockFetcher([
        WebhookTriggerEvents.BOOKING_CREATED,
        WebhookTriggerEvents.BOOKING_CANCELLED,
        WebhookTriggerEvents.BOOKING_RESCHEDULED,
        WebhookTriggerEvents.BOOKING_REQUESTED,
        WebhookTriggerEvents.BOOKING_REJECTED,
        WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
      ]),
      createMockFetcher([WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED, WebhookTriggerEvents.BOOKING_PAID]),
      createMockFetcher([WebhookTriggerEvents.FORM_SUBMITTED]),
      createMockFetcher([
        WebhookTriggerEvents.RECORDING_READY,
        WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED,
      ]),
      createMockFetcher([WebhookTriggerEvents.OOO_CREATED]),
    ];

    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    consumer = new WebhookTaskConsumer(mockWebhookRepository, mockDataFetchers, mockLogger);
  });

  describe("Constructor & Dependencies", () => {
    it("should be instantiable with Repository, Data Fetchers, and Logger", () => {
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
          version: WebhookVersion.V_2021_10_20,
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
            version: WebhookVersion.V_2021_10_20,
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

      await expect(consumer.processWebhookTask(payload, "task-error")).rejects.toThrow("Repository error");

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
          version: WebhookVersion.V_2021_10_20,
        },
      ]);

      // Mock the data fetcher to return null (simulating event not found)
      const bookingFetcher = mockDataFetchers[0];
      (bookingFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

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

  describe("Future Implementation Tests", () => {
    it("TODO [When WebhookTaskConsumer.fetchBookingData() is implemented]: Test full booking data fetching", () => {
      // When: BookingRepository is injected into WebhookTaskConsumer
      // When: fetchBookingData() implementation is complete
      // Test: Fetch booking, eventType, user, attendees from database
      // Test: Verify correct data structure returned
      expect(true).toBe(true); // Placeholder
    });

    it("TODO [When PayloadBuilders are integrated into sendWebhooksToSubscribers()]: Test payload building", () => {
      // When: BookingPayloadBuilder is integrated (for booking events)
      // When: FormPayloadBuilder is integrated (for form events)
      // When: RecordingPayloadBuilder is integrated (for recording events)
      // When: OOOPayloadBuilder is integrated (for OOO events)
      // Test: Build versioned payloads, apply payload templates
      expect(true).toBe(true); // Placeholder
    });

    it("TODO [When sendWebhooksToSubscribers() makes HTTP calls]: Test HTTP delivery", () => {
      // When: HTTP client is integrated (or existing sendPayload is used)
      // When: sendWebhooksToSubscribers() sends to subscriber.subscriberUrl
      // Test: Mock HTTP calls, verify correct payload sent
      // Test: Handle retries, timeouts, errors
      expect(true).toBe(true); // Placeholder
    });

    it("TODO [When all services are wired]: Integration test for full Producer→Consumer flow", () => {
      // When: All webhook services use Producer/Consumer pattern
      // Test: Full flow - Producer → Tasker → Consumer → HTTP delivery
      // Test: Verify webhook received by mock HTTP server
      // Test: Retry logic with task processor
      // Test: E2E with real database and task queue
      expect(true).toBe(true); // Placeholder
    });
  });
});
