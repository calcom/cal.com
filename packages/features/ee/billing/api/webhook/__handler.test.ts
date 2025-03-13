import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

import stripe from "@calcom/app-store/stripepayment/lib/server";

import { stripeWebhookHandler, HttpCode } from "./__handler";

vi.mock("@calcom/app-store/stripepayment/lib/server", () => ({
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

  const createMockRequest = (headers = {}, body = "") => {
    const req = new NextRequest("https://example.com/api/stripe-webhook", {
      method: "POST",
      headers: new Headers(headers),
      body,
    });

    req.text = vi.fn().mockResolvedValue(body);

    return req;
  };

  it("should throw an error if stripe-signature header is missing", async () => {
    const req = createMockRequest();
    const handler = stripeWebhookHandler({});
    await expect(handler(req)).rejects.toThrow(new HttpCode(400, "Missing stripe-signature"));
  });

  it("should throw an error if STRIPE_WEBHOOK_SECRET_BILLING is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_BILLING", "");
    const req = createMockRequest({
      "stripe-signature": "test_signature",
    });
    const handler = stripeWebhookHandler({});
    await expect(handler(req)).rejects.toThrow(new HttpCode(500, "Missing STRIPE_WEBHOOK_SECRET"));
  });

  it("should throw an error if event type is unhandled", async () => {
    const req = createMockRequest(
      {
        "stripe-signature": "test_signature",
      },
      "test_payload"
    );

    (stripe.webhooks.constructEvent as any).mockReturnValueOnce({ type: "unhandled_event" });

    const handler = stripeWebhookHandler({});
    await expect(handler(req)).rejects.toThrow(
      new HttpCode(202, "Unhandled Stripe Webhook event type unhandled_event")
    );
  });

  it("should call the appropriate handler for a valid event", async () => {
    const req = createMockRequest(
      {
        "stripe-signature": "test_signature",
      },
      "test_payload"
    );

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
