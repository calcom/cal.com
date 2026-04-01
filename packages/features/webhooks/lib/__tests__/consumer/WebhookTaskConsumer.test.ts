import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IWebhookDataFetcher } from "../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../interface/IWebhookRepository";
import { WebhookVersion } from "../../interface/IWebhookRepository";
import type { ILogger } from "../../interface/infrastructure";
import type { IWebhookService } from "../../interface/services";
import type { PayloadBuilderFactory } from "../../factory/versioned/PayloadBuilderFactory";
import type { WebhookTaskPayload } from "../../types/webhookTask";
import { WebhookTaskConsumer } from "../../service/WebhookTaskConsumer";

/**
 * Unit Tests for WebhookTaskConsumer
 *
 * Tests the Consumer service for processing webhook delivery tasks.
 * The consumer handles the heavy lifting: DB queries, payload building, HTTP delivery.
 *
 * Constructor signature:
 * - webhookRepository: IWebhookRepository
 * - dataFetchers: IWebhookDataFetcher[]
 * - payloadBuilderFactory: PayloadBuilderFactory
 * - webhookService: IWebhookService
 * - logger: ILogger
 */
describe("WebhookTaskConsumer", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockDataFetchers: IWebhookDataFetcher[];
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockWebhookRepository = {
      getSubscribers: vi.fn().mockResolvedValue([]),
      getWebhookById: vi.fn(),
      findByWebhookId: vi.fn(),
      findByOrgIdAndTrigger: vi.fn(),
      getFilteredWebhooksForUser: vi.fn(),
    } as unknown as IWebhookRepository;

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

    mockPayloadBuilderFactory = {
      getBuilder: vi.fn().mockReturnValue({
        build: vi.fn().mockReturnValue({ payload: "mock-payload" }),
      }),
    } as unknown as PayloadBuilderFactory;

    mockWebhookService = {
      processWebhooks: vi.fn().mockResolvedValue(undefined),
    } as unknown as IWebhookService;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    consumer = new WebhookTaskConsumer(
      mockWebhookRepository,
      mockDataFetchers,
      mockPayloadBuilderFactory,
      mockWebhookService,
      mockLogger
    );
  });

  describe("Constructor & Dependencies", () => {
    it("should be instantiable with all required dependencies", () => {
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

      expect(mockLogger.debug).toHaveBeenCalledWith(
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

      expect(mockLogger.debug).toHaveBeenCalledWith(
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
        userId: undefined,
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
    it("should find appropriate data fetcher for BOOKING_REQUESTED", async () => {
      const payload: WebhookTaskPayload = {
        operationId: "op-test",
        triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED,
        bookingUid: "test-booking-uid",
        timestamp: new Date().toISOString(),
      };

      await expect(consumer.processWebhookTask(payload, "task-test")).resolves.not.toThrow();

      const bookingFetcher = mockDataFetchers[0];
      expect(bookingFetcher.canHandle).toHaveBeenCalledWith(WebhookTriggerEvents.BOOKING_REQUESTED);
    });

    it("should throw error when no data fetcher found for trigger event", async () => {
      const payload: WebhookTaskPayload = {
        operationId: "op-test",
        triggerEvent: "UNKNOWN_EVENT" as WebhookTriggerEvents,
        bookingUid: "test-booking-uid",
        timestamp: new Date().toISOString(),
      };

      await expect(consumer.processWebhookTask(payload, "task-test")).rejects.toThrow(
        "No data fetcher registered for trigger event: UNKNOWN_EVENT"
      );
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
        bookingUid: "booking-123",
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
});
