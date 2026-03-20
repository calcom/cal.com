import { Prisma } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookDeliveryResult, WebhookSubscriber } from "../../dto/types";
import { WebhookVersion } from "../../interface/IWebhookRepository";
import { WebhookHttpError, WebhookSendError } from "../../service/WebhookService";
import {
  attemptDelivery,
  classifyAndLogError,
  type DeliveryContext,
  deactivateIfGone,
  deliverToSubscriber,
  extractErrorMessage,
  isRetryableError,
  isRetryableHttpError,
  isRetryablePrismaError,
  isWebhookDeliveryError,
  logDeliverySummary,
  RETRYABLE_PRISMA_CODES,
  RETRYABLE_STATUS_CODES,
  type SendFn,
  throwIfUnexpectedErrors,
} from "./deliver-webhook";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@trigger.dev/sdk", () => ({
  logger: mockLogger,
  retry: {
    onThrow: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
  },
  queue: vi.fn(() => ({})),
  schemaTask: vi.fn((config) => config),
}));

vi.mock("p-limit", () => ({
  default: vi.fn(() => {
    return (fn: () => Promise<unknown>) => fn();
  }),
}));

function createSubscriber(overrides?: Partial<WebhookSubscriber>): WebhookSubscriber {
  return {
    id: "wh-1",
    subscriberUrl: "https://example.com/webhook",
    payloadTemplate: null,
    appId: null,
    secret: "test-secret",
    eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
    version: WebhookVersion.V_2021_10_20,
    ...overrides,
  };
}

function createSuccessfulSendFn(): SendFn {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    message: "OK",
    duration: 0,
    subscriberUrl: "https://example.com/webhook",
    webhookId: "wh-1",
  } satisfies WebhookDeliveryResult);
}

function createContext(overrides?: Partial<DeliveryContext>): DeliveryContext {
  return {
    operationId: "op-123",
    taskId: "task-456",
    ...overrides,
  };
}

function createWebhookPayload() {
  return { createdAt: "now", triggerEvent: WebhookTriggerEvents.BOOKING_CREATED, payload: {} } as never;
}

describe("RETRYABLE_STATUS_CODES", () => {
  it("includes 5xx server errors", () => {
    expect(RETRYABLE_STATUS_CODES.has(500)).toBe(true);
    expect(RETRYABLE_STATUS_CODES.has(502)).toBe(true);
    expect(RETRYABLE_STATUS_CODES.has(503)).toBe(true);
    expect(RETRYABLE_STATUS_CODES.has(504)).toBe(true);
  });

  it("includes 408 and 429", () => {
    expect(RETRYABLE_STATUS_CODES.has(408)).toBe(true);
    expect(RETRYABLE_STATUS_CODES.has(429)).toBe(true);
  });

  it("does not include other 4xx codes", () => {
    expect(RETRYABLE_STATUS_CODES.has(400)).toBe(false);
    expect(RETRYABLE_STATUS_CODES.has(401)).toBe(false);
    expect(RETRYABLE_STATUS_CODES.has(403)).toBe(false);
    expect(RETRYABLE_STATUS_CODES.has(404)).toBe(false);
    expect(RETRYABLE_STATUS_CODES.has(410)).toBe(false);
  });
});

describe("isRetryablePrismaError", () => {
  it("returns true for PrismaClientInitializationError", () => {
    const error = new Prisma.PrismaClientInitializationError("init failed", "1.0.0");
    expect(isRetryablePrismaError(error)).toBe(true);
  });

  it("returns true for PrismaClientUnknownRequestError", () => {
    const error = new Prisma.PrismaClientUnknownRequestError("unknown", { clientVersion: "1.0.0" });
    expect(isRetryablePrismaError(error)).toBe(true);
  });

  it("returns true for PrismaClientKnownRequestError with retryable code P2024", () => {
    const error = new Prisma.PrismaClientKnownRequestError("pool timeout", {
      code: "P2024",
      clientVersion: "1.0.0",
    });
    expect(isRetryablePrismaError(error)).toBe(true);
  });

  it("returns true for PrismaClientKnownRequestError with retryable code P1008", () => {
    const error = new Prisma.PrismaClientKnownRequestError("query timeout", {
      code: "P1008",
      clientVersion: "1.0.0",
    });
    expect(isRetryablePrismaError(error)).toBe(true);
  });

  it("returns false for PrismaClientKnownRequestError with non-retryable code", () => {
    const error = new Prisma.PrismaClientKnownRequestError("unique constraint", {
      code: "P2002",
      clientVersion: "1.0.0",
    });
    expect(isRetryablePrismaError(error)).toBe(false);
  });

  it("returns false for PrismaClientValidationError", () => {
    const error = new Prisma.PrismaClientValidationError("validation failed", { clientVersion: "1.0.0" });
    expect(isRetryablePrismaError(error)).toBe(false);
  });

  it("returns false for plain Error", () => {
    expect(isRetryablePrismaError(new Error("something"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isRetryablePrismaError("string")).toBe(false);
    expect(isRetryablePrismaError(null)).toBe(false);
  });
});

describe("RETRYABLE_PRISMA_CODES", () => {
  it("includes expected Prisma error codes", () => {
    expect(RETRYABLE_PRISMA_CODES.has("P1008")).toBe(true);
    expect(RETRYABLE_PRISMA_CODES.has("P1017")).toBe(true);
    expect(RETRYABLE_PRISMA_CODES.has("P2024")).toBe(true);
    expect(RETRYABLE_PRISMA_CODES.has("P2034")).toBe(true);
  });

  it("does not include non-retryable codes", () => {
    expect(RETRYABLE_PRISMA_CODES.has("P2002")).toBe(false);
    expect(RETRYABLE_PRISMA_CODES.has("P2025")).toBe(false);
  });
});

describe("isRetryableHttpError", () => {
  it("returns true for 500 WebhookHttpError", () => {
    const error = new WebhookHttpError(500, "https://example.com", "ISE");
    expect(isRetryableHttpError(error)).toBe(true);
  });

  it("returns true for 429 WebhookHttpError", () => {
    const error = new WebhookHttpError(429, "https://example.com", "Too Many Requests");
    expect(isRetryableHttpError(error)).toBe(true);
  });

  it("returns true for 408 WebhookHttpError", () => {
    const error = new WebhookHttpError(408, "https://example.com", "Request Timeout");
    expect(isRetryableHttpError(error)).toBe(true);
  });

  it("returns false for 404 WebhookHttpError (non-retryable)", () => {
    const error = new WebhookHttpError(404, "https://example.com", "Not Found");
    expect(isRetryableHttpError(error)).toBe(false);
  });

  it("returns false for 410 WebhookHttpError (non-retryable)", () => {
    const error = new WebhookHttpError(410, "https://example.com", "Gone");
    expect(isRetryableHttpError(error)).toBe(false);
  });

  it("returns false for 401 WebhookHttpError (non-retryable)", () => {
    const error = new WebhookHttpError(401, "https://example.com", "Unauthorized");
    expect(isRetryableHttpError(error)).toBe(false);
  });

  it("returns false for plain Error", () => {
    expect(isRetryableHttpError(new Error("something"))).toBe(false);
  });

  it("returns false for WebhookSendError", () => {
    expect(isRetryableHttpError(new WebhookSendError("https://example.com", "network"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isRetryableHttpError("string error")).toBe(false);
    expect(isRetryableHttpError(null)).toBe(false);
    expect(isRetryableHttpError(undefined)).toBe(false);
  });
});

describe("isWebhookDeliveryError", () => {
  it("returns true for WebhookHttpError", () => {
    expect(isWebhookDeliveryError(new WebhookHttpError(500, "https://example.com", "ISE"))).toBe(true);
  });

  it("returns true for WebhookSendError", () => {
    expect(isWebhookDeliveryError(new WebhookSendError("https://example.com", "network"))).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isWebhookDeliveryError(new Error("something"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isWebhookDeliveryError("string")).toBe(false);
    expect(isWebhookDeliveryError(null)).toBe(false);
  });
});

describe("isRetryableError", () => {
  it("returns true for retryable HTTP errors (500)", () => {
    expect(isRetryableError(new WebhookHttpError(500, "https://example.com", "ISE"))).toBe(true);
  });

  it("returns true for retryable HTTP errors (502)", () => {
    expect(isRetryableError(new WebhookHttpError(502, "https://example.com", "Bad Gateway"))).toBe(true);
  });

  it("returns true for retryable HTTP errors (503)", () => {
    expect(isRetryableError(new WebhookHttpError(503, "https://example.com", "Service Unavailable"))).toBe(
      true
    );
  });

  it("returns true for retryable HTTP errors (504)", () => {
    expect(isRetryableError(new WebhookHttpError(504, "https://example.com", "Gateway Timeout"))).toBe(true);
  });

  it("returns true for retryable HTTP errors (408)", () => {
    expect(isRetryableError(new WebhookHttpError(408, "https://example.com", "Request Timeout"))).toBe(true);
  });

  it("returns true for retryable HTTP errors (429)", () => {
    expect(isRetryableError(new WebhookHttpError(429, "https://example.com", "Too Many Requests"))).toBe(
      true
    );
  });

  it("returns true for WebhookSendError (network failure)", () => {
    expect(isRetryableError(new WebhookSendError("https://example.com", "network failure"))).toBe(true);
  });

  it("returns true for retryable Prisma error (P2024)", () => {
    const error = new Prisma.PrismaClientKnownRequestError("pool timeout", {
      code: "P2024",
      clientVersion: "1.0.0",
    });
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for PrismaClientInitializationError", () => {
    const error = new Prisma.PrismaClientInitializationError("init failed", "1.0.0");
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for PrismaClientUnknownRequestError", () => {
    const error = new Prisma.PrismaClientUnknownRequestError("unknown", { clientVersion: "1.0.0" });
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns false for non-retryable HTTP errors (404)", () => {
    expect(isRetryableError(new WebhookHttpError(404, "https://example.com", "Not Found"))).toBe(false);
  });

  it("returns false for non-retryable HTTP errors (410)", () => {
    expect(isRetryableError(new WebhookHttpError(410, "https://example.com", "Gone"))).toBe(false);
  });

  it("returns false for non-retryable HTTP errors (401)", () => {
    expect(isRetryableError(new WebhookHttpError(401, "https://example.com", "Unauthorized"))).toBe(false);
  });

  it("returns false for PrismaClientValidationError", () => {
    const error = new Prisma.PrismaClientValidationError("validation failed", { clientVersion: "1.0.0" });
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for non-retryable PrismaClientKnownRequestError (P2002)", () => {
    const error = new Prisma.PrismaClientKnownRequestError("unique constraint", {
      code: "P2002",
      clientVersion: "1.0.0",
    });
    expect(isRetryableError(error)).toBe(false);
  });

  it("returns false for plain Error", () => {
    expect(isRetryableError(new Error("something"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isRetryableError("string")).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe("extractErrorMessage", () => {
  it("extracts message from Error", () => {
    expect(extractErrorMessage(new Error("test error"))).toBe("test error");
  });

  it("extracts message from WebhookHttpError", () => {
    const error = new WebhookHttpError(404, "https://example.com", "Not Found");
    expect(extractErrorMessage(error)).toBe("Not Found");
  });

  it("extracts message from WebhookSendError", () => {
    const error = new WebhookSendError("https://example.com", "network failure");
    expect(extractErrorMessage(error)).toBe("network failure");
  });

  it("converts non-Error values to string", () => {
    expect(extractErrorMessage("string error")).toBe("string error");
    expect(extractErrorMessage(42)).toBe("42");
    expect(extractErrorMessage(null)).toBe("null");
  });
});

describe("attemptDelivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success when sendFn succeeds", async () => {
    const sendFn = createSuccessfulSendFn();
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("success");
    expect(result.subscriber).toBe(subscriber);
  });

  it("returns retryable for 500 WebhookHttpError", async () => {
    const sendFn = vi.fn().mockRejectedValue(new WebhookHttpError(500, "https://example.com/webhook", "ISE"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("retryable");
  });

  it("returns retryable for 502 WebhookHttpError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(502, "https://example.com/webhook", "Bad Gateway"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("retryable");
  });

  it("returns retryable for 429 WebhookHttpError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(429, "https://example.com/webhook", "Too Many Requests"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("retryable");
  });

  it("returns retryable for WebhookSendError (network failure)", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookSendError("https://example.com/webhook", "network failure"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("retryable");
  });

  it("returns retryable for retryable Prisma error (P2024)", async () => {
    const sendFn = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("pool timeout", {
        code: "P2024",
        clientVersion: "1.0.0",
      })
    );
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("retryable");
  });

  it("returns retryable for PrismaClientInitializationError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new Prisma.PrismaClientInitializationError("init failed", "1.0.0"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("retryable");
  });

  it("returns retryable for PrismaClientUnknownRequestError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new Prisma.PrismaClientUnknownRequestError("unknown", { clientVersion: "1.0.0" }));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("retryable");
  });

  it("returns nonRetryable for 404 WebhookHttpError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(404, "https://example.com/webhook", "Not Found"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("nonRetryable");
  });

  it("returns nonRetryable for 401 WebhookHttpError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(401, "https://example.com/webhook", "Unauthorized"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("nonRetryable");
  });

  it("returns nonRetryable for 410 WebhookHttpError (Gone)", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(410, "https://example.com/webhook", "Gone"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("nonRetryable");
  });

  it("returns nonRetryable for 400 WebhookHttpError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(400, "https://example.com/webhook", "Bad Request"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("nonRetryable");
  });

  it("returns unexpected for non-retryable Prisma error (P2002)", async () => {
    const sendFn = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique constraint", {
        code: "P2002",
        clientVersion: "1.0.0",
      })
    );
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("unexpected");
  });

  it("returns unexpected for PrismaClientValidationError", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientValidationError("validation failed", { clientVersion: "1.0.0" })
      );
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("unexpected");
  });

  it("returns unexpected for plain Error", async () => {
    const sendFn = vi.fn().mockRejectedValue(new Error("SDK failure"));
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.status).toBe("unexpected");
  });

  it("includes the error in the result for retryable failures", async () => {
    const httpError = new WebhookHttpError(500, "https://example.com/webhook", "ISE");
    const sendFn = vi.fn().mockRejectedValue(httpError);
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.error).toBe(httpError);
  });

  it("includes the error in the result for nonRetryable failures", async () => {
    const httpError = new WebhookHttpError(404, "https://example.com/webhook", "Not Found");
    const sendFn = vi.fn().mockRejectedValue(httpError);
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.error).toBe(httpError);
  });

  it("includes the error in the result for unexpected failures", async () => {
    const plainError = new Error("SDK failure");
    const sendFn = vi.fn().mockRejectedValue(plainError);
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.error).toBe(plainError);
  });

  it("does not include an error in the result for success", async () => {
    const sendFn = createSuccessfulSendFn();
    const subscriber = createSubscriber();

    const result = await attemptDelivery(
      sendFn,
      WebhookTriggerEvents.BOOKING_CREATED,
      createWebhookPayload(),
      subscriber
    );

    expect(result.error).toBeUndefined();
  });
});

describe("deliverToSubscriber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sendFn and succeeds without error", async () => {
    const sendFn = createSuccessfulSendFn();
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).resolves.toBeUndefined();

    expect(sendFn).toHaveBeenCalledTimes(1);
  });

  it("propagates retryable HTTP 500 errors for retry", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(500, "https://example.com/webhook", "status 500: ISE"));
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("status 500");
  });

  it("propagates retryable HTTP 429 errors for retry", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(
        new WebhookHttpError(429, "https://example.com/webhook", "status 429: Too Many Requests")
      );
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("status 429");
  });

  it("propagates WebhookSendError for retry (network failures)", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookSendError("https://example.com/webhook", "fetch failed"));
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("fetch failed");
  });

  it("propagates retryable Prisma errors for retry (P2024)", async () => {
    const sendFn = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("pool timeout", {
        code: "P2024",
        clientVersion: "1.0.0",
      })
    );
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("pool timeout");
  });

  it("propagates PrismaClientInitializationError for retry", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new Prisma.PrismaClientInitializationError("init failed", "1.0.0"));
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("init failed");
  });

  it("catches non-retryable 404 errors and throws them outside retry", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(404, "https://example.com/webhook", "status 404: Not Found"));
    const subscriber = createSubscriber();

    try {
      await deliverToSubscriber(
        sendFn,
        WebhookTriggerEvents.BOOKING_CREATED,
        createWebhookPayload(),
        subscriber
      );
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WebhookHttpError);
      expect((error as WebhookHttpError).statusCode).toBe(404);
    }
  });

  it("catches non-retryable 401 errors and throws them outside retry", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(
        new WebhookHttpError(401, "https://example.com/webhook", "status 401: Unauthorized")
      );
    const subscriber = createSubscriber();

    try {
      await deliverToSubscriber(
        sendFn,
        WebhookTriggerEvents.BOOKING_CREATED,
        createWebhookPayload(),
        subscriber
      );
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WebhookHttpError);
      expect((error as WebhookHttpError).statusCode).toBe(401);
    }
  });

  it("catches 410 Gone errors and throws them outside retry (non-retryable)", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(new WebhookHttpError(410, "https://example.com/webhook", "status 410: Gone"));
    const subscriber = createSubscriber();

    try {
      await deliverToSubscriber(
        sendFn,
        WebhookTriggerEvents.BOOKING_CREATED,
        createWebhookPayload(),
        subscriber
      );
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(WebhookHttpError);
      expect((error as WebhookHttpError).statusCode).toBe(410);
    }
  });

  it("catches PrismaClientValidationError without retrying", async () => {
    const sendFn = vi
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientValidationError("validation failed", { clientVersion: "1.0.0" })
      );
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("validation failed");
  });

  it("catches non-retryable PrismaClientKnownRequestError (P2002) without retrying", async () => {
    const sendFn = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique constraint", {
        code: "P2002",
        clientVersion: "1.0.0",
      })
    );
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("unique constraint");
  });

  it("catches plain Error without retrying", async () => {
    const sendFn = vi.fn().mockRejectedValue(new Error("serialization bug"));
    const subscriber = createSubscriber();

    await expect(
      deliverToSubscriber(sendFn, WebhookTriggerEvents.BOOKING_CREATED, createWebhookPayload(), subscriber)
    ).rejects.toThrow("serialization bug");
  });

  it("wraps non-Error thrown values in an Error", async () => {
    const sendFn = vi.fn().mockRejectedValue("string error");
    const subscriber = createSubscriber();

    try {
      await deliverToSubscriber(
        sendFn,
        WebhookTriggerEvents.BOOKING_CREATED,
        createWebhookPayload(),
        subscriber
      );
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("string error");
    }
  });
});

describe("classifyAndLogError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs retryable HTTP status with 'after retries' message", () => {
    const error = new WebhookHttpError(500, "https://example.com/webhook", "ISE");
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook delivery failed with retryable HTTP 500 after retries",
      expect.objectContaining({
        webhookId: "wh-1",
        subscriberUrl: "https://example.com/webhook",
      })
    );
  });

  it("logs 410 Gone with deactivation message", () => {
    const error = new WebhookHttpError(410, "https://example.com/webhook", "Gone");
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook delivery failed with HTTP 410 Gone, webhook will be deactivated",
      expect.objectContaining({
        webhookId: "wh-1",
      })
    );
  });

  it("logs non-retryable HTTP status with 'not retried' message", () => {
    const error = new WebhookHttpError(404, "https://example.com/webhook", "Not Found");
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook delivery failed with non-retryable HTTP 404, not retried",
      expect.objectContaining({
        webhookId: "wh-1",
      })
    );
  });

  it("logs network error for WebhookSendError", () => {
    const error = new WebhookSendError("https://example.com/webhook", "network failure");
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook delivery failed due to network error after retries",
      expect.objectContaining({
        webhookId: "wh-1",
      })
    );
  });

  it("logs retryable Prisma error with code", () => {
    const error = new Prisma.PrismaClientKnownRequestError("pool timeout", {
      code: "P2024",
      clientVersion: "1.0.0",
    });
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook delivery failed due to retryable Prisma error (P2024) after retries",
      expect.objectContaining({
        webhookId: "wh-1",
      })
    );
  });

  it("logs retryable Prisma error with class name for non-known errors", () => {
    const error = new Prisma.PrismaClientInitializationError("init failed", "1.0.0");
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(true);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook delivery failed due to retryable Prisma error (PrismaClientInitializationError) after retries",
      expect.objectContaining({
        webhookId: "wh-1",
      })
    );
  });

  it("classifies PrismaClientValidationError as isDelivery=false (unexpected)", () => {
    const error = new Prisma.PrismaClientValidationError("validation failed", { clientVersion: "1.0.0" });
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Unexpected error during webhook delivery",
      expect.objectContaining({
        webhookId: "wh-1",
        error: "validation failed",
      })
    );
  });

  it("classifies non-retryable PrismaClientKnownRequestError (P2002) as isDelivery=false", () => {
    const error = new Prisma.PrismaClientKnownRequestError("unique constraint", {
      code: "P2002",
      clientVersion: "1.0.0",
    });
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Unexpected error during webhook delivery",
      expect.objectContaining({
        webhookId: "wh-1",
      })
    );
  });

  it("classifies unexpected errors (plain Error) as isDelivery=false", () => {
    const error = new Error("SDK serialization failure");
    const subscriber = createSubscriber();
    const context = createContext();

    const result = classifyAndLogError(error, subscriber, context);

    expect(result.isDelivery).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Unexpected error during webhook delivery",
      expect.objectContaining({
        webhookId: "wh-1",
        error: "SDK serialization failure",
      })
    );
  });

  it("includes context fields in log output", () => {
    const error = new WebhookHttpError(500, "https://example.com/webhook", "ISE");
    const subscriber = createSubscriber();
    const context = createContext({ operationId: "op-abc", taskId: "task-xyz" });

    classifyAndLogError(error, subscriber, context);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        operationId: "op-abc",
        taskId: "task-xyz",
      })
    );
  });
});

describe("logDeliverySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs completion info with counts", () => {
    const context = createContext();
    logDeliverySummary(context, 3, 2, 1, 0);

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Webhook delivery completed",
      expect.objectContaining({
        total: 3,
        succeeded: 2,
        failed: 1,
        unexpectedErrorCount: 0,
      })
    );
  });

  it("logs error when there are failures", () => {
    const context = createContext();
    logDeliverySummary(context, 3, 1, 2, 0);

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook delivery completed with failures",
      expect.objectContaining({
        succeeded: 1,
        failed: 2,
      })
    );
  });

  it("does not log error when there are no failures", () => {
    const context = createContext();
    logDeliverySummary(context, 2, 2, 0, 0);

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("includes unexpectedErrorCount in the info log", () => {
    const context = createContext();
    logDeliverySummary(context, 5, 2, 1, 2);

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Webhook delivery completed",
      expect.objectContaining({
        unexpectedErrorCount: 2,
      })
    );
  });
});

describe("deactivateIfGone", () => {
  const mockDeactivateWebhook = vi.fn();
  const mockRepository = { deactivateWebhook: mockDeactivateWebhook } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deactivates webhook when error is a 410 WebhookHttpError", async () => {
    const error = new WebhookHttpError(410, "https://example.com/webhook", "Gone");
    const subscriber = createSubscriber();
    const context = createContext();

    await deactivateIfGone(error, subscriber, mockRepository, context);

    expect(mockDeactivateWebhook).toHaveBeenCalledWith("wh-1");
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Webhook deactivated due to 410 Gone response",
      expect.objectContaining({
        webhookId: "wh-1",
        subscriberUrl: "https://example.com/webhook",
      })
    );
  });

  it("does nothing for non-410 WebhookHttpError", async () => {
    const error = new WebhookHttpError(404, "https://example.com/webhook", "Not Found");
    const subscriber = createSubscriber();
    const context = createContext();

    await deactivateIfGone(error, subscriber, mockRepository, context);

    expect(mockDeactivateWebhook).not.toHaveBeenCalled();
  });

  it("does nothing for 500 WebhookHttpError", async () => {
    const error = new WebhookHttpError(500, "https://example.com/webhook", "ISE");
    const subscriber = createSubscriber();
    const context = createContext();

    await deactivateIfGone(error, subscriber, mockRepository, context);

    expect(mockDeactivateWebhook).not.toHaveBeenCalled();
  });

  it("does nothing for non-WebhookHttpError", async () => {
    const error = new WebhookSendError("https://example.com/webhook", "network failure");
    const subscriber = createSubscriber();
    const context = createContext();

    await deactivateIfGone(error, subscriber, mockRepository, context);

    expect(mockDeactivateWebhook).not.toHaveBeenCalled();
  });

  it("does nothing for plain Error", async () => {
    const error = new Error("something");
    const subscriber = createSubscriber();
    const context = createContext();

    await deactivateIfGone(error, subscriber, mockRepository, context);

    expect(mockDeactivateWebhook).not.toHaveBeenCalled();
  });

  it("logs error if deactivation fails but does not throw", async () => {
    mockDeactivateWebhook.mockRejectedValue(new Error("DB connection lost"));
    const error = new WebhookHttpError(410, "https://example.com/webhook", "Gone");
    const subscriber = createSubscriber();
    const context = createContext();

    await deactivateIfGone(error, subscriber, mockRepository, context);

    expect(mockDeactivateWebhook).toHaveBeenCalledWith("wh-1");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to deactivate webhook after 410 Gone",
      expect.objectContaining({
        webhookId: "wh-1",
        error: "DB connection lost",
      })
    );
  });

  it("logs error with stringified value if deactivation throws non-Error", async () => {
    mockDeactivateWebhook.mockRejectedValue("string error");
    const error = new WebhookHttpError(410, "https://example.com/webhook", "Gone");
    const subscriber = createSubscriber();
    const context = createContext();

    await deactivateIfGone(error, subscriber, mockRepository, context);

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to deactivate webhook after 410 Gone",
      expect.objectContaining({
        error: "string error",
      })
    );
  });
});

describe("throwIfUnexpectedErrors", () => {
  it("does not throw when array is empty", () => {
    expect(() => throwIfUnexpectedErrors([], "op-123")).not.toThrow();
  });

  it("throws aggregated error with all messages", () => {
    const errors = [new Error("error one"), new Error("error two")];

    expect(() => throwIfUnexpectedErrors(errors, "op-123")).toThrow(
      "Unexpected errors during webhook delivery (operationId=op-123): error one; error two"
    );
  });

  it("includes operationId in the thrown error message", () => {
    const errors = [new Error("fail")];

    expect(() => throwIfUnexpectedErrors(errors, "op-xyz")).toThrow("operationId=op-xyz");
  });

  it("handles a single error", () => {
    const errors = [new Error("solo failure")];

    expect(() => throwIfUnexpectedErrors(errors, "op-1")).toThrow(
      "Unexpected errors during webhook delivery (operationId=op-1): solo failure"
    );
  });
});
