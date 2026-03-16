import process from "node:process";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookSubscriber } from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import { type IWebhookRepository, WebhookVersion } from "../interface/IWebhookRepository";
import type { ILogger, ITasker } from "../interface/infrastructure";
import { WebhookService } from "./WebhookService";

describe("WebhookService", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let mockTasker: ReturnType<typeof createMockTasker>;

  function createMockLogger() {
    const subLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn(),
    };
    subLogger.getSubLogger.mockReturnValue(subLogger);

    return {
      getSubLogger: vi.fn().mockReturnValue(subLogger),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  }

  function createMockRepository() {
    return {
      getSubscribers: vi.fn(),
      getWebhookById: vi.fn(),
      findByWebhookId: vi.fn(),
      getFilteredWebhooksForUser: vi.fn(),
      listWebhooks: vi.fn(),
    };
  }

  function createMockTasker() {
    return {
      create: vi.fn(),
      cancelWithReference: vi.fn(),
    };
  }

  beforeEach(() => {
    mockFetch = vi.fn();
    mockLogger = createMockLogger();
    mockRepository = createMockRepository();
    mockTasker = createMockTasker();

    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(""),
    });
    // Ensure TASKER_ENABLE_WEBHOOKS is not set so we use direct sending
    delete process.env.TASKER_ENABLE_WEBHOOKS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("error handling in sendWebhookDirectly", () => {
    const subscriber: WebhookSubscriber = {
      id: "webhook-1",
      subscriberUrl: "https://example.com/webhook",
      payloadTemplate: null,
      appId: null,
      secret: "test-secret",
      eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
      version: WebhookVersion.V_2021_10_20,
    };

    const payload = {
      createdAt: new Date().toISOString(),
      payload: { test: "data", triggerEvent: WebhookTriggerEvents.BOOKING_CREATED },
    } as unknown as WebhookPayload;

    it("should throw on network errors when sending directly", async () => {
      mockFetch.mockRejectedValue(new TypeError("fetch failed"));

      const service = new WebhookService(
        mockRepository as unknown as IWebhookRepository,
        mockTasker as unknown as ITasker,
        mockLogger as unknown as ILogger
      );

      await expect(
        service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber])
      ).resolves.not.toThrow();

      // The error is caught by processWebhooks via Promise.allSettled, but it should have been thrown by sendWebhook
      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        "Error sending webhook",
        expect.objectContaining({
          error: expect.stringContaining("Failed to send webhook to https://example.com/webhook"),
        })
      );
    });

    it("should throw on non-OK HTTP responses when sending directly", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Internal Server Error"),
      });

      const service = new WebhookService(
        mockRepository as unknown as IWebhookRepository,
        mockTasker as unknown as ITasker,
        mockLogger as unknown as ILogger
      );

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        "Error sending webhook",
        expect.objectContaining({
          error: expect.stringContaining(
            "Webhook POST to https://example.com/webhook failed with status 500"
          ),
        })
      );
    });

    it("should return error object instead of throwing when TASKER_ENABLE_WEBHOOKS is '1'", async () => {
      process.env.TASKER_ENABLE_WEBHOOKS = "1";
      mockTasker.create.mockRejectedValue(new Error("Tasker failed"));

      const service = new WebhookService(
        mockRepository as unknown as IWebhookRepository,
        mockTasker as unknown as ITasker,
        mockLogger as unknown as ILogger
      );

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      // When TASKER_ENABLE_WEBHOOKS is '1', errors are caught and returned as result objects
      // so processWebhooks logs via the 'Webhook failed' path, not 'Error sending webhook'
      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        "Webhook failed",
        expect.objectContaining({
          error: "Tasker failed",
          statusCode: 0,
        })
      );
    });
  });

  describe("X-Cal-Webhook-Version header", () => {
    it("should include X-Cal-Webhook-Version header when sending webhook directly", async () => {
      const service = new WebhookService(
        mockRepository as unknown as IWebhookRepository,
        mockTasker as unknown as ITasker,
        mockLogger as unknown as ILogger
      );

      const subscriber: WebhookSubscriber = {
        id: "webhook-1",
        subscriberUrl: "https://example.com/webhook",
        payloadTemplate: null,
        appId: null,
        secret: "test-secret",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        version: WebhookVersion.V_2021_10_20,
      };

      const payload: WebhookPayload = {
        createdAt: new Date().toISOString(),
        payload: { test: "data", triggerEvent: WebhookTriggerEvents.BOOKING_CREATED },
      } as unknown as WebhookPayload;

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://example.com/webhook");
      expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", "2021-10-20");
      expect(options.headers).toHaveProperty("X-Cal-Signature-256");
      expect(options.headers).toHaveProperty("Content-Type", "application/json");
    });

    it("should include correct version for each subscriber", async () => {
      const service = new WebhookService(
        mockRepository as unknown as IWebhookRepository,
        mockTasker as unknown as ITasker,
        mockLogger as unknown as ILogger
      );

      const subscriber1: WebhookSubscriber = {
        id: "webhook-1",
        subscriberUrl: "https://example1.com/webhook",
        payloadTemplate: null,
        appId: null,
        secret: "secret-1",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        version: WebhookVersion.V_2021_10_20,
      };

      const subscriber2: WebhookSubscriber = {
        id: "webhook-2",
        subscriberUrl: "https://example2.com/webhook",
        payloadTemplate: null,
        appId: null,
        secret: "secret-2",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        version: WebhookVersion.V_2021_10_20,
      };

      const payload = {
        createdAt: new Date().toISOString(),
        payload: { test: "data", triggerEvent: WebhookTriggerEvents.BOOKING_CREATED },
      } as unknown as WebhookPayload;

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [
        subscriber1,
        subscriber2,
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Check both calls have the version header
      mockFetch.mock.calls.forEach((call) => {
        const [, options] = call;
        expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", "2021-10-20");
      });
    });

    it("should schedule webhook with version when TASKER_ENABLE_WEBHOOKS is enabled", async () => {
      process.env.TASKER_ENABLE_WEBHOOKS = "1";

      const service = new WebhookService(
        mockRepository as unknown as IWebhookRepository,
        mockTasker as unknown as ITasker,
        mockLogger as unknown as ILogger
      );

      const subscriber: WebhookSubscriber = {
        id: "webhook-1",
        subscriberUrl: "https://example.com/webhook",
        payloadTemplate: null,
        appId: null,
        secret: "test-secret",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        version: WebhookVersion.V_2021_10_20,
      };

      const payload = {
        createdAt: new Date().toISOString(),
        payload: { test: "data", triggerEvent: WebhookTriggerEvents.BOOKING_CREATED },
      } as unknown as WebhookPayload;

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      expect(mockTasker.create).toHaveBeenCalledTimes(1);
      const [taskName, taskPayload] = mockTasker.create.mock.calls[0];

      expect(taskName).toBe("sendWebhook");
      const parsedPayload = JSON.parse(taskPayload);
      expect(parsedPayload.webhook.version).toBe("2021-10-20");
    });
  });
});
