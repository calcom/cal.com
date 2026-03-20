import stripe from "@calcom/features/ee/payments/server/stripe";
import { buffer } from "micro";
import type { NextApiRequest } from "next";
import { createMocks } from "node-mocks-http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpCode, stripeWebhookHandler } from "./__handler";

vi.mock("micro", () => ({
  buffer: vi.fn(),
}));

vi.mock("@calcom/features/ee/payments/server/stripe", () => ({
  default: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

const mockTryAcquire = vi.fn();
const mockMarkCompleted = vi.fn();
const mockMarkFailed = vi.fn();

vi.mock("../../di/containers/WebhookEventService", () => ({
  getWebhookEventService: vi.fn(() => ({
    tryAcquire: mockTryAcquire,
    markCompleted: mockMarkCompleted,
    markFailed: mockMarkFailed,
  })),
}));

const STRIPE_WEBHOOK_SECRET_BILLING = "whsec_test_secret";

describe("stripeWebhookHandler", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_BILLING", STRIPE_WEBHOOK_SECRET_BILLING);
    mockTryAcquire.mockResolvedValue({ id: "record_1" });
    mockMarkCompleted.mockResolvedValue(undefined);
    mockMarkFailed.mockResolvedValue(undefined);
  });

  const mockRequest = (headers: Record<string, string>, body: string): NextApiRequest =>
    ({
      headers,
      body,
    }) as unknown as NextApiRequest;

  it("should throw an error if stripe-signature header is missing", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
    });

    const handler = stripeWebhookHandler({});
    await expect(handler(req)).rejects.toThrow(new HttpCode(400, "Missing stripe-signature"));
  });

  it("should throw an error if STRIPE_WEBHOOK_SECRET_BILLING is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_BILLING", "");
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
    });
    const handler = stripeWebhookHandler({});
    await expect(handler(req)).rejects.toThrow(new HttpCode(500, "Missing STRIPE_WEBHOOK_SECRET"));
  });

  it("should return success false if event type is unhandled", async () => {
    const { req } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
    });
    vi.mocked(buffer).mockResolvedValueOnce(Buffer.from("test_payload"));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      id: "evt_unhandled",
      type: "unhandled_event",
    });

    const handler = stripeWebhookHandler({});
    const response = await handler(req);
    expect(response).toEqual({
      success: false,
      message: "Unhandled Stripe Webhook event type unhandled_event",
    });
  });

  it("should call the appropriate handler for a valid event", async () => {
    const req = mockRequest({ "stripe-signature": "test_signature" }, "test_payload");
    vi.mocked(buffer).mockResolvedValueOnce(Buffer.from("test_payload"));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      id: "evt_valid",
      type: "payment_intent.succeeded",
      data: "test_data",
    });

    const mockHandler = vi.fn().mockResolvedValueOnce("handler_response");
    const handlers = {
      "payment_intent.succeeded": () => Promise.resolve({ default: mockHandler }),
    };

    const handler = stripeWebhookHandler(handlers);
    const response = await handler(req);

    expect(mockHandler).toHaveBeenCalledWith("test_data");
    expect(response).toBe("handler_response");
    expect(mockMarkCompleted).toHaveBeenCalledWith("record_1");
  });

  it("should skip duplicate events", async () => {
    mockTryAcquire.mockResolvedValueOnce(null);

    const req = mockRequest({ "stripe-signature": "test_signature" }, "test_payload");
    vi.mocked(buffer).mockResolvedValueOnce(Buffer.from("test_payload"));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      id: "evt_duplicate",
      type: "payment_intent.succeeded",
      data: "test_data",
    });

    const mockHandler = vi.fn();
    const handlers = {
      "payment_intent.succeeded": () => Promise.resolve({ default: mockHandler }),
    };

    const handler = stripeWebhookHandler(handlers);
    const response = await handler(req);

    expect(response).toEqual({ success: true, message: "Duplicate event, already processed" });
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should mark event as failed when handler throws", async () => {
    const req = mockRequest({ "stripe-signature": "test_signature" }, "test_payload");
    vi.mocked(buffer).mockResolvedValueOnce(Buffer.from("test_payload"));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      id: "evt_fail",
      type: "payment_intent.succeeded",
      data: "test_data",
    });

    const mockHandler = vi.fn().mockRejectedValueOnce(new Error("handler error"));
    const handlers = {
      "payment_intent.succeeded": () => Promise.resolve({ default: mockHandler }),
    };

    const handler = stripeWebhookHandler(handlers);
    await expect(handler(req)).rejects.toThrow("handler error");
    expect(mockMarkFailed).toHaveBeenCalledWith("record_1");
  });

  it("should retry previously failed events", async () => {
    mockTryAcquire.mockResolvedValueOnce({ id: "record_failed" });

    const req = mockRequest({ "stripe-signature": "test_signature" }, "test_payload");
    vi.mocked(buffer).mockResolvedValueOnce(Buffer.from("test_payload"));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      id: "evt_retry",
      type: "payment_intent.succeeded",
      data: "test_data",
    });

    const mockHandler = vi.fn().mockResolvedValueOnce("retry_response");
    const handlers = {
      "payment_intent.succeeded": () => Promise.resolve({ default: mockHandler }),
    };

    const handler = stripeWebhookHandler(handlers);
    const response = await handler(req);

    expect(mockHandler).toHaveBeenCalledWith("test_data");
    expect(response).toBe("retry_response");
    expect(mockMarkCompleted).toHaveBeenCalledWith("record_failed");
  });

  it("should proceed without deduplication if idempotency check fails", async () => {
    mockTryAcquire.mockRejectedValueOnce(new Error("DB connection failed"));

    const req = mockRequest({ "stripe-signature": "test_signature" }, "test_payload");
    vi.mocked(buffer).mockResolvedValueOnce(Buffer.from("test_payload"));
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce({
      id: "evt_db_fail",
      type: "payment_intent.succeeded",
      data: "test_data",
    });

    const mockHandler = vi.fn().mockResolvedValueOnce("handler_response");
    const handlers = {
      "payment_intent.succeeded": () => Promise.resolve({ default: mockHandler }),
    };

    const handler = stripeWebhookHandler(handlers);
    const response = await handler(req);

    expect(mockHandler).toHaveBeenCalledWith("test_data");
    expect(response).toBe("handler_response");
  });
});
