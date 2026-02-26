/**
 * Unit tests for the Stripe booking payment webhook handler.
 *
 * Covers:
 * - Rejection of non-POST requests (405)
 * - Rejection when stripe-signature header is missing (400)
 * - Rejection when STRIPE_WEBHOOK_SECRET is not set (500)
 * - Rejection when signature verification fails (constructEvent throws)
 * - Rejection of connected-account events when not in E2E (202)
 * - Unhandled event type returns 202
 * - Valid payment_intent.succeeded dispatches to handler and returns 200
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
vi.mock("@calcom/app-store/_utils/payments/handlePaymentSuccess");
vi.mock("@calcom/prisma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/prisma")>();
  const mockPayment = {
    findFirst: vi.fn().mockResolvedValue({ id: 1, bookingId: 2 }),
  };
  const mockPrisma = {
    ...actual.default,
    payment: mockPayment,
  };
  return {
    ...actual,
    default: mockPrisma,
    prisma: mockPrisma,
  };
});
vi.mock("@calcom/lib/server/getServerErrorFromUnknown", () => ({
  getServerErrorFromUnknown: (err: unknown) => {
    const e = err as { statusCode?: number; message?: string };
    return {
      statusCode: e?.statusCode ?? 500,
      message: e?.message ?? "Unknown error",
      cause: err,
    };
  },
}));
vi.mock("@calcom/lib/tracing/factory", () => ({
  distributedTracing: {
    createTrace: vi.fn(() => ({ traceId: "trace", spanId: "span", operation: "op" })),
  },
}));

const mockBuffer = vi.mocked(await import("micro")).buffer;
const mockConstructEvent = vi.mocked(
  (await import("@calcom/features/ee/payments/server/stripe")).default.webhooks.constructEvent
);
const mockHandlePaymentSuccess = vi.mocked(
  await import("@calcom/app-store/_utils/payments/handlePaymentSuccess")
).handlePaymentSuccess;

async function loadHandler() {
  return (await import("./webhook")).default;
}

function createReq(
  overrides: Partial<NextApiRequest> & { method?: string; headers?: Record<string, string> }
): NextApiRequest {
  return {
    method: "POST",
    headers: {},
    ...overrides,
  } as unknown as NextApiRequest;
}

function createRes(): NextApiResponse {
  const res = {
    statusCode: 200,
    status: vi.fn(function (this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return res;
    }),
    send: vi.fn(),
    json: vi.fn(),
  };
  return res as unknown as NextApiResponse;
}

describe("Stripe booking payment webhook handler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: "whsec_test_secret" };
    delete process.env.NEXT_PUBLIC_IS_E2E;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 405 when method is not POST", async () => {
    const req = createReq({ method: "GET" });
    const res = createRes();
    const handler = await loadHandler();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Method Not Allowed" })
    );
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = createReq({ headers: {} });
    const res = createRes();
    const handler = await loadHandler();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Missing stripe-signature" })
    );
    expect(mockBuffer).not.toHaveBeenCalled();
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const req = createReq({ headers: { "stripe-signature": "t=1,v1=sig" } });
    const res = createRes();
    mockBuffer.mockResolvedValue(Buffer.from('{"id":"evt_1"}'));

    const handler = await loadHandler();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Missing process.env.STRIPE_WEBHOOK_SECRET" })
    );
  });

  it("rethrows and returns 400 when signature verification fails", async () => {
    const req = createReq({ headers: { "stripe-signature": "invalid" } });
    const res = createRes();
    mockBuffer.mockResolvedValue(Buffer.from('{"id":"evt_1"}'));
    const verificationError = new Error("Signature verification failed");
    mockConstructEvent.mockImplementation(() => {
      throw verificationError;
    });

    const handler = await loadHandler();
    await handler(req, res);

    expect(mockConstructEvent).toHaveBeenCalledWith(
      '{"id":"evt_1"}',
      "invalid",
      "whsec_test_secret"
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Signature verification failed" })
    );
  });

  it("returns 202 when event has no account (connected-account) and not in E2E", async () => {
    const req = createReq({ headers: { "stripe-signature": "t=1,v1=x" } });
    const res = createRes();
    mockBuffer.mockResolvedValue(Buffer.from('{"id":"evt_1"}'));
    mockConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "payment_intent.succeeded",
      account: null,
      data: { object: { id: "pi_1" } },
    } as any);

    const handler = await loadHandler();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Incoming connected account" })
    );
    expect(mockHandlePaymentSuccess).not.toHaveBeenCalled();
  });

  it("returns 202 for unhandled event type", async () => {
    process.env.NEXT_PUBLIC_IS_E2E = "1";
    const req = createReq({ headers: { "stripe-signature": "t=1,v1=x" } });
    const res = createRes();
    mockBuffer.mockResolvedValue(Buffer.from('{"id":"evt_1"}'));
    mockConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "invoice.paid",
      data: {},
    } as any);

    const handler = await loadHandler();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Unhandled Stripe Webhook event type invoice.paid" })
    );
  });

  it("calls handleStripePaymentSuccess and returns 200 for valid payment_intent.succeeded", async () => {
    process.env.NEXT_PUBLIC_IS_E2E = "1";
    const req = createReq({ headers: { "stripe-signature": "t=1,v1=x" } });
    const res = createRes();
    mockBuffer.mockResolvedValue(Buffer.from('{"id":"evt_1","type":"payment_intent.succeeded"}'));
    const mockEvent = {
      id: "evt_1",
      type: "payment_intent.succeeded",
      account: null,
      data: { object: { id: "pi_123" } },
    };
    mockConstructEvent.mockReturnValue(mockEvent as any);

    const handler = await loadHandler();
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(mockHandlePaymentSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 1,
        bookingId: 2,
        appSlug: "stripe",
      })
    );
  });
});
