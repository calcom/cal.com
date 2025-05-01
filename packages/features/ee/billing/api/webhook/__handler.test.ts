import { buffer } from "micro";
import type { NextApiRequest } from "next";
import { createMocks } from "node-mocks-http";
import { describe, it, expect, vi, beforeEach } from "vitest";

import stripe from "@calcom/features/ee/payments/server/stripe";

import { stripeWebhookHandler, HttpCode } from "./__handler";

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

const STRIPE_WEBHOOK_SECRET_BILLING = "whsec_test_secret";

describe("stripeWebhookHandler", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_BILLING", STRIPE_WEBHOOK_SECRET_BILLING);
  });

  const mockRequest = (headers: Record<string, string>, body: string): NextApiRequest =>
    ({
      headers,
      body,
    } as unknown as NextApiRequest);

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
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
      },
    });
    // const req = mockRequest({ "stripe-signature": "test_signature" }, "test_payload");
    (buffer as any).mockResolvedValueOnce(Buffer.from("test_payload"));
    (stripe.webhooks.constructEvent as any).mockReturnValueOnce({ type: "unhandled_event" });

    const handler = stripeWebhookHandler({});
    const response = await handler(req);
    expect(response).toEqual({
      success: false,
      message: "Unhandled Stripe Webhook event type unhandled_event",
    });
  });

  it("should call the appropriate handler for a valid event", async () => {
    const req = mockRequest({ "stripe-signature": "test_signature" }, "test_payload");
    (buffer as any).mockResolvedValueOnce(Buffer.from("test_payload"));
    (stripe.webhooks.constructEvent as any).mockReturnValueOnce({
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
