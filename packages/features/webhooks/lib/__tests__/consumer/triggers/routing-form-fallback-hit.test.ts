import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayloadBuilderFactory } from "../../../factory/versioned/PayloadBuilderFactory";
import type { IWebhookDataFetcher } from "../../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../../interface/IWebhookRepository";
import { WebhookVersion } from "../../../interface/IWebhookRepository";
import type { ILogger } from "../../../interface/infrastructure";
import type { IWebhookService } from "../../../interface/services";
import { WebhookTaskConsumer } from "../../../service/WebhookTaskConsumer";
import type { RoutingFormFallbackHitWebhookTaskPayload } from "../../../types/webhookTask";

/**
 * ROUTING_FORM_FALLBACK_HIT Trigger Tests
 *
 * Tests specific to the ROUTING_FORM_FALLBACK_HIT webhook trigger.
 * This trigger fires when a routing form submission hits a fallback action.
 * The fetcher resolves response/formName from DB via responseId (PII-free metadata).
 */
describe("ROUTING_FORM_FALLBACK_HIT Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockFormDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const sampleEventData = {
    formId: "form-abc",
    formName: "Test Routing Form",
    responseId: 456,
    fallbackAction: {
      type: "externalRedirectUrl",
      value: "https://example.com/fallback",
    },
    responses: { "field-1": { label: "Email", value: "test@example.com" } },
  };

  const defaultSubscriber = {
    id: "sub-fallback-1",
    subscriberUrl: "https://example.com/fallback-webhook",
    payloadTemplate: null,
    appId: null,
    secret: "fallback-secret",
    time: null,
    timeUnit: null,
    eventTriggers: [WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT],
    version: WebhookVersion.V_2021_10_20,
  };

  beforeEach(() => {
    mockWebhookRepository = {
      getSubscribers: vi.fn().mockResolvedValue([]),
      getWebhookById: vi.fn(),
      findByWebhookId: vi.fn(),
      findByOrgIdAndTrigger: vi.fn(),
      getFilteredWebhooksForUser: vi.fn(),
    } as unknown as IWebhookRepository;

    mockFormDataFetcher = {
      canHandle: vi.fn((event) => event === WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT),
      fetchEventData: vi.fn().mockResolvedValue({ data: sampleEventData }),
      getSubscriberContext: vi.fn((payload: RoutingFormFallbackHitWebhookTaskPayload) => ({
        triggerEvent: payload.triggerEvent,
        userId: payload.userId,
        eventTypeId: undefined,
        teamId: payload.teamId,
        orgId: payload.orgId,
        oAuthClientId: payload.oAuthClientId,
      })),
    };

    mockPayloadBuilderFactory = {
      getBuilder: vi.fn().mockReturnValue({
        build: vi.fn().mockImplementation((dto) => dto),
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
      [mockFormDataFetcher],
      mockPayloadBuilderFactory,
      mockWebhookService,
      mockLogger
    );
  });

  describe("Happy path", () => {
    it("should process ROUTING_FORM_FALLBACK_HIT and build correct DTO", async () => {
      const timestamp = "2025-12-20T12:00:00.000Z";
      const payload: RoutingFormFallbackHitWebhookTaskPayload = {
        operationId: "op-fallback-1",
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        formId: "form-abc",
        responseId: 456,
        teamId: 10,
        userId: 5,
        orgId: 99,
        oAuthClientId: null,
        timestamp,
        metadata: {
          fallbackAction: {
            type: "externalRedirectUrl",
            value: "https://example.com/fallback",
          },
        },
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-fallback-1");

      expect(mockFormDataFetcher.canHandle).toHaveBeenCalledWith(
        WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT
      );
      expect(mockFormDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
          createdAt: timestamp,
          form: { id: "form-abc", name: "Test Routing Form" },
          responseId: 456,
          fallbackAction: {
            type: "externalRedirectUrl",
            value: "https://example.com/fallback",
          },
          responses: { "field-1": { label: "Email", value: "test@example.com" } },
          userId: 5,
          teamId: 10,
          orgId: 99,
        }),
        expect.arrayContaining([
          expect.objectContaining({ subscriberUrl: "https://example.com/fallback-webhook" }),
        ])
      );
    });

    it("should include eventTypeId in fallbackAction when present", async () => {
      const eventDataWithEventType = {
        ...sampleEventData,
        fallbackAction: {
          type: "eventTypeRedirectUrl",
          value: "team/30min",
          eventTypeId: 42,
        },
      };
      vi.mocked(mockFormDataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        { data: eventDataWithEventType }
      );

      const payload: RoutingFormFallbackHitWebhookTaskPayload = {
        operationId: "op-fallback-evt",
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        formId: "form-abc",
        responseId: 456,
        teamId: 10,
        userId: 5,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
        metadata: {
          fallbackAction: {
            type: "eventTypeRedirectUrl",
            value: "team/30min",
            eventTypeId: 42,
          },
        },
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-fallback-evt");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        expect.objectContaining({
          fallbackAction: {
            type: "eventTypeRedirectUrl",
            value: "team/30min",
            eventTypeId: 42,
          },
        }),
        expect.any(Array)
      );
    });
  });

  describe("Missing event data", () => {
    it("should warn and skip when fetcher returns null", async () => {
      vi.mocked(mockFormDataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: null });

      const payload: RoutingFormFallbackHitWebhookTaskPayload = {
        operationId: "op-fallback-null",
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        formId: "form-abc",
        responseId: 456,
        teamId: null,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
        metadata: {},
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-fallback-null");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Event data not found",
        expect.objectContaining({
          operationId: "op-fallback-null",
          triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        })
      );
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should warn and skip when event data fails validation", async () => {
      vi.mocked(mockFormDataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {
        formId: "form-abc",
        // missing formName and responseId
      } });

      const payload: RoutingFormFallbackHitWebhookTaskPayload = {
        operationId: "op-fallback-invalid",
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        formId: "form-abc",
        responseId: 456,
        teamId: null,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
        metadata: {},
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-fallback-invalid");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Missing required fields for routing form fallback hit DTO",
        expect.objectContaining({ errors: expect.any(Array) })
      );
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });

  describe("No subscribers", () => {
    it("should skip processing when no subscribers found", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([]);

      const payload: RoutingFormFallbackHitWebhookTaskPayload = {
        operationId: "op-fallback-nosub",
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        formId: "form-abc",
        responseId: 456,
        teamId: null,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
        metadata: {},
      };

      await consumer.processWebhookTask(payload, "task-fallback-nosub");

      expect(mockFormDataFetcher.fetchEventData).not.toHaveBeenCalled();
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });

  describe("DTO field mapping", () => {
    it("should pass userId and teamId from payload to DTO", async () => {
      const payload: RoutingFormFallbackHitWebhookTaskPayload = {
        operationId: "op-fallback-fields",
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        formId: "form-abc",
        responseId: 456,
        userId: 99,
        teamId: 55,
        orgId: 77,
        oAuthClientId: "oauth-fallback",
        timestamp: "2025-12-20T12:00:00.000Z",
        metadata: {},
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-fallback-fields");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        expect.objectContaining({
          userId: 99,
          teamId: 55,
          orgId: 77,
        }),
        expect.any(Array)
      );
    });

    it("should default userId and teamId to null when not provided", async () => {
      const payload: RoutingFormFallbackHitWebhookTaskPayload = {
        operationId: "op-fallback-defaults",
        triggerEvent: WebhookTriggerEvents.ROUTING_FORM_FALLBACK_HIT,
        formId: "form-abc",
        responseId: 456,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
        metadata: {},
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-fallback-defaults");

      const [, dto] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      const dtoRecord = dto as Record<string, unknown>;
      expect(dtoRecord.userId).toBeNull();
      expect(dtoRecord.teamId).toBeNull();
    });
  });
});
