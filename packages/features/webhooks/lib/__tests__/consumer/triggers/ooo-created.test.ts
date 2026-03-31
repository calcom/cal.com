import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayloadBuilderFactory } from "../../../factory/versioned/PayloadBuilderFactory";
import type { IWebhookDataFetcher } from "../../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../../interface/IWebhookRepository";
import { WebhookVersion } from "../../../interface/IWebhookRepository";
import type { ILogger } from "../../../interface/infrastructure";
import type { IWebhookService } from "../../../interface/services";
import { WebhookTaskConsumer } from "../../../service/WebhookTaskConsumer";
import type { OOOWebhookTaskPayload } from "../../../types/webhookTask";

/**
 * OOO_CREATED Trigger Tests
 *
 * Tests specific to the OOO_CREATED webhook trigger.
 * This trigger fires when an Out of Office entry is created.
 * The fetcher resolves PII from DB; teamIds/orgId are at root level.
 */
describe("OOO_CREATED Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockOOODataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const sampleOOOEntry = {
    id: 42,
    start: "2025-12-22T00:00:00+04:00",
    end: "2025-12-23T00:00:00+04:00",
    createdAt: "2025-12-20T10:00:00.000Z",
    updatedAt: "2025-12-20T10:00:00.000Z",
    notes: "Sick leave",
    reason: { emoji: "\u{1F3E5}", reason: "Sick leave" },
    reasonId: 1,
    user: {
      id: 5,
      name: "Test User",
      username: "testuser",
      email: "test@example.com",
      timeZone: "Asia/Dubai",
    },
    toUser: null,
    uuid: "ooo-uuid-123",
  };

  const defaultSubscriber = {
    id: "sub-ooo-1",
    subscriberUrl: "https://example.com/ooo-webhook",
    payloadTemplate: null,
    appId: null,
    secret: "ooo-secret",
    time: null,
    timeUnit: null,
    eventTriggers: [WebhookTriggerEvents.OOO_CREATED],
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

    mockOOODataFetcher = {
      canHandle: vi.fn((event) => event === WebhookTriggerEvents.OOO_CREATED),
      fetchEventData: vi.fn().mockResolvedValue({ data: { oooEntry: sampleOOOEntry } }),
      getSubscriberContext: vi.fn((payload: OOOWebhookTaskPayload) => ({
        triggerEvent: payload.triggerEvent,
        userId: payload.userId,
        eventTypeId: undefined,
        teamId: undefined,
        orgId: undefined,
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
      [mockOOODataFetcher],
      mockPayloadBuilderFactory,
      mockWebhookService,
      mockLogger
    );
  });

  describe("Happy path", () => {
    it("should process OOO_CREATED and build correct DTO with oooEntry", async () => {
      const timestamp = "2025-12-20T12:00:00.000Z";
      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-1",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 5,
        teamId: 3,
        oAuthClientId: null,
        timestamp,
        teamIds: [10, 20],
        orgId: 99,
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-ooo-1");

      expect(mockOOODataFetcher.canHandle).toHaveBeenCalledWith(WebhookTriggerEvents.OOO_CREATED);
      expect(mockOOODataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.OOO_CREATED,
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.OOO_CREATED,
          createdAt: timestamp,
          oooEntry: sampleOOOEntry,
          userId: 5,
          teamId: 3,
        }),
        expect.arrayContaining([
          expect.objectContaining({ subscriberUrl: "https://example.com/ooo-webhook" }),
        ])
      );
    });

    it("should extract orgId from root payload in DTO", async () => {
      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-org",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 5,
        teamId: null,
        orgId: 99,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-ooo-org");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.OOO_CREATED,
        expect.objectContaining({
          orgId: 99,
        }),
        expect.any(Array)
      );
    });

    it("should set orgId to undefined when not provided", async () => {
      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-no-org",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 5,
        teamId: null,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-ooo-no-org");

      const [, dto] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      expect((dto as Record<string, unknown>).orgId).toBeUndefined();
    });
  });

  describe("Missing oooEntry", () => {
    it("should warn and skip when event data has no oooEntry", async () => {
      vi.mocked(mockOOODataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-missing",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 5,
        teamId: null,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-ooo-missing");

      expect(mockLogger.warn).toHaveBeenCalledWith("Missing oooEntry for OOO DTO");
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should warn and skip when fetcher returns null", async () => {
      vi.mocked(mockOOODataFetcher.fetchEventData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: null });

      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-null",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 5,
        teamId: null,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-ooo-null");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Event data not found",
        expect.objectContaining({
          operationId: "op-ooo-null",
          triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        })
      );
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });

  describe("No subscribers", () => {
    it("should skip processing when no subscribers found", async () => {
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([]);

      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-nosub",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 5,
        teamId: null,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
      };

      await consumer.processWebhookTask(payload, "task-ooo-nosub");

      expect(mockOOODataFetcher.fetchEventData).not.toHaveBeenCalled();
      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });
  });

  describe("DTO field mapping", () => {
    it("should pass userId and teamId from payload to DTO", async () => {
      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-fields",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 99,
        teamId: 55,
        oAuthClientId: "oauth-ooo",
        timestamp: "2025-12-20T12:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-ooo-fields");

      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.OOO_CREATED,
        expect.objectContaining({
          userId: 99,
          teamId: 55,
        }),
        expect.any(Array)
      );
    });

    it("should default userId and teamId to null when not provided", async () => {
      const payload: OOOWebhookTaskPayload = {
        operationId: "op-ooo-defaults",
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        oooEntryId: 42,
        userId: 5,
        oAuthClientId: null,
        timestamp: "2025-12-20T12:00:00.000Z",
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-ooo-defaults");

      const [, dto] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      const dtoRecord = dto as Record<string, unknown>;
      expect(dtoRecord.teamId).toBeNull();
    });
  });
});
