import { createHmac } from "node:crypto";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookSubscriber } from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import type { IWebhookRepository } from "../interface/IWebhookRepository";
import { WebhookVersion } from "../interface/IWebhookRepository";
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
      findByOrgIdAndTrigger: vi.fn(),
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

  function createService(
    overrides?: Partial<{
      repository: typeof mockRepository;
      tasker: typeof mockTasker | null;
      logger: typeof mockLogger;
    }>
  ) {
    return new WebhookService(
      (overrides?.repository ?? mockRepository) as unknown as IWebhookRepository,
      (overrides?.tasker !== undefined ? overrides.tasker : mockTasker) as unknown as ITasker,
      (overrides?.logger ?? mockLogger) as unknown as ILogger
    );
  }

  function createSubscriber(overrides?: Partial<WebhookSubscriber>): WebhookSubscriber {
    return {
      id: "webhook-1",
      subscriberUrl: "https://example.com/webhook",
      payloadTemplate: null,
      appId: null,
      secret: "test-secret",
      eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
      version: WebhookVersion.V_2021_10_20,
      ...overrides,
    };
  }

  function createPayload(overrides?: Partial<WebhookPayload>): WebhookPayload {
    return {
      createdAt: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      payload: { test: "data", triggerEvent: WebhookTriggerEvents.BOOKING_CREATED },
      ...overrides,
    } as unknown as WebhookPayload;
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
    vi.resetAllMocks();
  });

  describe("X-Cal-Webhook-Version header", () => {
    it("should include X-Cal-Webhook-Version header when sending webhook directly", async () => {
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe("https://example.com/webhook");
      expect(options.headers).toHaveProperty("X-Cal-Webhook-Version", "2021-10-20");
      expect(options.headers).toHaveProperty("X-Cal-Signature-256");
      expect(options.headers).toHaveProperty("Content-Type", "application/json");
    });

    it("should include correct version for each subscriber", async () => {
      const service = createService();
      const subscriber1 = createSubscriber({
        id: "webhook-1",
        subscriberUrl: "https://example1.com/webhook",
      });
      const subscriber2 = createSubscriber({
        id: "webhook-2",
        subscriberUrl: "https://example2.com/webhook",
      });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [
        subscriber1,
        subscriber2,
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      mockFetch.mock.calls.forEach((call: [string, RequestInit]) => {
        const [, options] = call;
        expect((options.headers as Record<string, string>)["X-Cal-Webhook-Version"]).toBe("2021-10-20");
      });
    });

    it("should schedule webhook with version when TASKER_ENABLE_WEBHOOKS is enabled", async () => {
      process.env.TASKER_ENABLE_WEBHOOKS = "1";
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      expect(mockTasker.create).toHaveBeenCalledTimes(1);
      const [taskName, taskPayload] = mockTasker.create.mock.calls[0];

      expect(taskName).toBe("sendWebhook");
      const parsedPayload = JSON.parse(taskPayload);
      expect(parsedPayload.webhook.version).toBe("2021-10-20");
    });
  });

  describe("sendWebhook (via processWebhooks)", () => {
    it("should route to scheduleWebhook when TASKER_ENABLE_WEBHOOKS=1", async () => {
      process.env.TASKER_ENABLE_WEBHOOKS = "1";
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      expect(mockTasker.create).toHaveBeenCalledTimes(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should route to sendWebhookDirectly when env not set", async () => {
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockTasker.create).not.toHaveBeenCalled();
    });

    it("should handle error from sendWebhookDirectly gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalled();
    });

    it("should handle error from scheduleWebhook gracefully", async () => {
      process.env.TASKER_ENABLE_WEBHOOKS = "1";
      mockTasker.create.mockRejectedValue(new Error("Tasker unavailable"));
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalled();
    });

    it("should handle missing tasker when TASKER_ENABLE_WEBHOOKS=1", async () => {
      process.env.TASKER_ENABLE_WEBHOOKS = "1";
      const service = createService({ tasker: null });
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalled();
    });
  });

  describe("sendWebhookDirectly (via processWebhooks)", () => {
    it("should send POST with JSON content type when no template", async () => {
      const service = createService();
      const subscriber = createSubscriber({ payloadTemplate: null });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should send with form-urlencoded when non-JSON template", async () => {
      const service = createService();
      const subscriber = createSubscriber({ payloadTemplate: "not-json-template" });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });

    it("should include HMAC signature when secret provided", async () => {
      const service = createService();
      const subscriber = createSubscriber({ secret: "my-secret" });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const [, options] = mockFetch.mock.calls[0];
      const signature = options.headers["X-Cal-Signature-256"];
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
      const expectedSignature = createHmac("sha256", "my-secret").update(options.body).digest("hex");
      expect(signature).toBe(expectedSignature);
    });

    it("should use 'no-secret-provided' when no secret", async () => {
      const service = createService();
      const subscriber = createSubscriber({ secret: null });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["X-Cal-Signature-256"]).toBe("no-secret-provided");
    });

    it("should log error when fetch returns non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Server Error"),
      });
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Webhook failed"),
        expect.objectContaining({ statusCode: 500 })
      );
    });

    it("should error when subscriberUrl is empty", async () => {
      const service = createService();
      const subscriber = createSubscriber({ subscriberUrl: "" });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalled();
    });
  });

  describe("processWebhooks", () => {
    it("should return early with no fetch calls when no subscribers", async () => {
      const service = createService();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, []);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("No subscribers"),
        expect.any(Object)
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send one webhook for single subscriber", async () => {
      const service = createService();
      const subscriber = createSubscriber();
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/webhook", expect.any(Object));
    });

    it("should send to all subscribers via Promise.allSettled", async () => {
      const service = createService();
      const subscribers = [
        createSubscriber({ id: "wh-1", subscriberUrl: "https://a.com/wh" }),
        createSubscriber({ id: "wh-2", subscriberUrl: "https://b.com/wh" }),
        createSubscriber({ id: "wh-3", subscriberUrl: "https://c.com/wh" }),
      ];
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, subscribers);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should process all subscribers even when one fails", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: vi.fn().mockResolvedValue("") })
        .mockRejectedValueOnce(new Error("Connection refused"))
        .mockResolvedValueOnce({ ok: true, status: 200, text: vi.fn().mockResolvedValue("") });

      const service = createService();
      const subscribers = [
        createSubscriber({ id: "wh-1", subscriberUrl: "https://a.com/wh" }),
        createSubscriber({ id: "wh-2", subscriberUrl: "https://b.com/wh" }),
        createSubscriber({ id: "wh-3", subscriberUrl: "https://c.com/wh" }),
      ];
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, subscribers);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should log failure count when all subscribers fail", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Server Error"),
      });
      const service = createService();
      const subscribers = [
        createSubscriber({ id: "wh-1", subscriberUrl: "https://a.com/wh" }),
        createSubscriber({ id: "wh-2", subscriberUrl: "https://b.com/wh" }),
      ];
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, subscribers);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledTimes(2);
      for (const call of subLogger.error.mock.calls) {
        expect(call[0]).toContain("Webhook failed");
      }
    });

    it("should log summary with correct success/failure counts", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200, text: vi.fn().mockResolvedValue("") })
        .mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue("fail") });
      const service = createService();
      const subscribers = [
        createSubscriber({ id: "wh-1", subscriberUrl: "https://a.com/wh" }),
        createSubscriber({ id: "wh-2", subscriberUrl: "https://b.com/wh" }),
      ];
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, subscribers);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Webhook processing completed"),
        expect.objectContaining({ totalSubscribers: 2, successful: 2, failed: 0 })
      );
    });

    it("should log individual failure with subscriber details", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: vi.fn().mockResolvedValue("Bad Gateway"),
      });
      const service = createService();
      const subscriber = createSubscriber({ id: "wh-fail", subscriberUrl: "https://fail.com/wh" });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Webhook failed"),
        expect.objectContaining({ webhookId: "wh-fail", statusCode: 502 })
      );
    });
  });

  describe("scheduleTimeBasedWebhook", () => {
    it("should return immediately when isDryRun=true", async () => {
      const service = createService();
      const subscriber = createSubscriber();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");

      await service.scheduleTimeBasedWebhook(
        WebhookTriggerEvents.MEETING_STARTED,
        scheduledAt,
        { id: 1, uid: "uid-1", eventTypeId: 10, userId: 5 },
        subscriber,
        { title: "Test" },
        true
      );

      expect(mockTasker.create).not.toHaveBeenCalled();
    });

    it("should create task with correct scheduledAt and referenceUid", async () => {
      const service = createService();
      const subscriber = createSubscriber();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");

      await service.scheduleTimeBasedWebhook(
        WebhookTriggerEvents.MEETING_STARTED,
        scheduledAt,
        { id: 42, uid: "uid-42", eventTypeId: 10, userId: 5 },
        subscriber,
        { title: "Test" }
      );

      expect(mockTasker.create).toHaveBeenCalledWith(
        "sendWebhook",
        expect.any(String),
        expect.objectContaining({
          scheduledAt,
          referenceUid: "booking-42-MEETING_STARTED",
        })
      );
    });

    it("should include booking data in payload", async () => {
      const service = createService();
      const subscriber = createSubscriber();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");

      await service.scheduleTimeBasedWebhook(
        WebhookTriggerEvents.MEETING_STARTED,
        scheduledAt,
        { id: 1, uid: "uid-1", eventTypeId: 10, userId: 5, teamId: 3, responses: { q1: "a1" } },
        subscriber,
        { title: "Meeting" }
      );

      const [, taskPayload] = mockTasker.create.mock.calls[0];
      const parsed = JSON.parse(taskPayload);
      expect(parsed.data.bookingId).toBe(1);
      expect(parsed.data.eventTypeId).toBe(10);
      expect(parsed.data.userId).toBe(5);
      expect(parsed.data.teamId).toBe(3);
      expect(parsed.data.responses).toEqual({ q1: "a1" });
    });

    it("should log error when tasker not injected", async () => {
      const service = createService({ tasker: null });
      const subscriber = createSubscriber();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");

      await service.scheduleTimeBasedWebhook(
        WebhookTriggerEvents.MEETING_STARTED,
        scheduledAt,
        { id: 1, uid: "uid-1", eventTypeId: 10, userId: 5 },
        subscriber,
        { title: "Test" }
      );

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to schedule time-based webhook"),
        expect.any(Object)
      );
    });

    it("should catch error and log without throwing", async () => {
      mockTasker.create.mockRejectedValue(new Error("Tasker error"));
      const service = createService();
      const subscriber = createSubscriber();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");

      await service.scheduleTimeBasedWebhook(
        WebhookTriggerEvents.MEETING_STARTED,
        scheduledAt,
        { id: 1, uid: "uid-1", eventTypeId: 10, userId: 5 },
        subscriber,
        { title: "Test" }
      );

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to schedule time-based webhook"),
        expect.objectContaining({ bookingId: 1 })
      );
    });
  });

  describe("cancelScheduledWebhooks", () => {
    it("should return immediately when isDryRun=true", async () => {
      const service = createService();

      await service.cancelScheduledWebhooks(1, undefined, true);

      expect(mockTasker.cancelWithReference).not.toHaveBeenCalled();
    });

    it("should use default triggers MEETING_STARTED and MEETING_ENDED", async () => {
      const service = createService();

      await service.cancelScheduledWebhooks(42);

      expect(mockTasker.cancelWithReference).toHaveBeenCalledTimes(2);
      expect(mockTasker.cancelWithReference).toHaveBeenCalledWith(
        "booking-42-MEETING_STARTED",
        "sendWebhook"
      );
      expect(mockTasker.cancelWithReference).toHaveBeenCalledWith("booking-42-MEETING_ENDED", "sendWebhook");
    });

    it("should cancel each custom trigger", async () => {
      const service = createService();

      await service.cancelScheduledWebhooks(42, [
        WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
      ]);

      expect(mockTasker.cancelWithReference).toHaveBeenCalledTimes(2);
      expect(mockTasker.cancelWithReference).toHaveBeenCalledWith(
        "booking-42-AFTER_HOSTS_CAL_VIDEO_NO_SHOW",
        "sendWebhook"
      );
    });

    it("should log warning on partial failure and continue", async () => {
      mockTasker.cancelWithReference
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Cancel failed"));

      const service = createService();

      await service.cancelScheduledWebhooks(42);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.warn).toHaveBeenCalled();
    });

    it("should log error when tasker not injected", async () => {
      const service = createService({ tasker: null });

      await service.cancelScheduledWebhooks(42);

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to cancel scheduled webhooks"),
        expect.any(Object)
      );
    });
  });

  describe("scheduleDelayedWebhooks", () => {
    it("should return immediately when isDryRun=true", async () => {
      const service = createService();
      const payload = createPayload();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");

      await service.scheduleDelayedWebhooks(
        WebhookTriggerEvents.BOOKING_CREATED,
        payload,
        scheduledAt,
        undefined,
        undefined,
        true
      );

      expect(mockTasker.create).not.toHaveBeenCalled();
      expect(mockRepository.getSubscribers).not.toHaveBeenCalled();
    });

    it("should use provided subscribers directly without fetching", async () => {
      const service = createService();
      const payload = createPayload();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");
      const subscribers = [createSubscriber()];

      await service.scheduleDelayedWebhooks(
        WebhookTriggerEvents.BOOKING_CREATED,
        payload,
        scheduledAt,
        undefined,
        subscribers
      );

      expect(mockRepository.getSubscribers).not.toHaveBeenCalled();
      expect(mockTasker.create).toHaveBeenCalledTimes(1);
    });

    it("should fetch subscribers from repository when not provided", async () => {
      const service = createService();
      const payload = createPayload();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");
      mockRepository.getSubscribers.mockResolvedValue([createSubscriber()]);

      await service.scheduleDelayedWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, scheduledAt, {
        teamId: 5,
        orgId: 10,
      });

      expect(mockRepository.getSubscribers).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
          teamId: 5,
          orgId: 10,
        })
      );
    });

    it("should return early when no subscribers found", async () => {
      const service = createService();
      const payload = createPayload();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");
      mockRepository.getSubscribers.mockResolvedValue([]);

      await service.scheduleDelayedWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, scheduledAt);

      expect(mockTasker.create).not.toHaveBeenCalled();
    });

    it("should create task per subscriber with scheduledAt", async () => {
      const service = createService();
      const payload = createPayload();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");
      const subscribers = [createSubscriber({ id: "wh-1" }), createSubscriber({ id: "wh-2" })];

      await service.scheduleDelayedWebhooks(
        WebhookTriggerEvents.BOOKING_CREATED,
        payload,
        scheduledAt,
        undefined,
        subscribers
      );

      expect(mockTasker.create).toHaveBeenCalledTimes(2);
      for (const call of mockTasker.create.mock.calls) {
        expect(call[2]).toEqual(expect.objectContaining({ scheduledAt }));
      }
    });

    it("should log and re-throw error when scheduling fails", async () => {
      mockTasker.create.mockRejectedValue(new Error("Scheduling failed"));
      const service = createService();
      const payload = createPayload();
      const scheduledAt = new Date("2024-06-01T10:00:00Z");
      const subscribers = [createSubscriber()];

      await expect(
        service.scheduleDelayedWebhooks(
          WebhookTriggerEvents.BOOKING_CREATED,
          payload,
          scheduledAt,
          undefined,
          subscribers
        )
      ).rejects.toThrow("Scheduling failed");

      const subLogger = mockLogger.getSubLogger.mock.results[0].value;
      expect(subLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to schedule delayed webhooks"),
        expect.any(Object)
      );
    });
  });

  describe("isJsonTemplate (via sendWebhookDirectly)", () => {
    it("should use JSON content type when template is null", async () => {
      const service = createService();
      const subscriber = createSubscriber({ payloadTemplate: null });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should use JSON content type when template is valid JSON", async () => {
      const service = createService();
      const subscriber = createSubscriber({ payloadTemplate: '{"key": "value"}' });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should use form-urlencoded when template is non-JSON", async () => {
      const service = createService();
      const subscriber = createSubscriber({ payloadTemplate: "key={{triggerEvent}}" });
      const payload = createPayload();

      await service.processWebhooks(WebhookTriggerEvents.BOOKING_CREATED, payload, [subscriber]);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    });
  });

  describe("getSubscribers", () => {
    it("should delegate to repository.getSubscribers", async () => {
      const service = createService();
      const options = {
        userId: 1,
        eventTypeId: 10,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        teamId: 5,
        orgId: null,
        oAuthClientId: null,
      };

      await service.getSubscribers(options);

      expect(mockRepository.getSubscribers).toHaveBeenCalledWith(options);
    });

    it("should return repository result", async () => {
      const expectedSubscribers = [createSubscriber()];
      mockRepository.getSubscribers.mockResolvedValue(expectedSubscribers);
      const service = createService();

      const result = await service.getSubscribers({
        userId: 1,
        eventTypeId: 10,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      expect(result).toEqual(expectedSubscribers);
    });
  });
});
