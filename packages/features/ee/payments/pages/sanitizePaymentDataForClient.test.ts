import { describe, it, expect } from "vitest";

import { sanitizePaymentDataForClient } from "./sanitizePaymentDataForClient";

describe("sanitizePaymentDataForClient", () => {
  it("preserves stripe_publishable_key", () => {
    const result = sanitizePaymentDataForClient({
      stripe_publishable_key: "pk_live_abc123",
    });
    expect(result.stripe_publishable_key).toBe("pk_live_abc123");
  });

  it("preserves setupIntent existence as empty object", () => {
    const result = sanitizePaymentDataForClient({
      setupIntent: { id: "seti_123", client_secret: "seti_secret_456" },
    });
    expect(result).toHaveProperty("setupIntent");
    expect(result.setupIntent).toEqual({});
  });

  it("strips client_secret from top-level data", () => {
    const result = sanitizePaymentDataForClient({
      client_secret: "pi_secret_abc",
      stripe_publishable_key: "pk_live_abc123",
    });
    expect(result).not.toHaveProperty("client_secret");
  });

  it("strips stripeAccount", () => {
    const result = sanitizePaymentDataForClient({
      stripeAccount: "acct_abc123",
      stripe_publishable_key: "pk_live_abc123",
    });
    expect(result).not.toHaveProperty("stripeAccount");
  });

  it("strips Stripe metadata containing booker PII", () => {
    const result = sanitizePaymentDataForClient({
      stripe_publishable_key: "pk_live_abc123",
      metadata: {
        bookerEmail: "test@example.com",
        bookerPhoneNumber: "+1234567890",
        bookerName: "John Doe",
        calAccountId: 12345,
        calUsername: "johndoe",
      },
    });
    expect(result).not.toHaveProperty("metadata");
  });

  it("strips full PaymentIntent fields", () => {
    const result = sanitizePaymentDataForClient({
      id: "pi_abc123",
      object: "payment_intent",
      amount: 5000,
      currency: "usd",
      customer: "cus_abc123",
      client_secret: "pi_secret_abc",
      status: "requires_payment_method",
      stripe_publishable_key: "pk_live_abc123",
      stripeAccount: "acct_abc123",
      metadata: {
        bookerEmail: "test@example.com",
        bookerName: "John Doe",
      },
    });

    expect(Object.keys(result)).toEqual(["stripe_publishable_key"]);
    expect(result.stripe_publishable_key).toBe("pk_live_abc123");
  });

  it("strips setupIntent internals but keeps existence for HOLD flow", () => {
    const result = sanitizePaymentDataForClient({
      setupIntent: {
        id: "seti_123",
        object: "setup_intent",
        client_secret: "seti_secret_456",
        customer: "cus_abc123",
        payment_method: "pm_abc123",
        metadata: { bookingId: 999, bookerPhoneNumber: "+1234567890" },
      },
      stripe_publishable_key: "pk_live_abc123",
      stripeAccount: "acct_abc123",
    });

    expect(Object.keys(result).sort()).toEqual(["setupIntent", "stripe_publishable_key"]);
    expect(result.setupIntent).toEqual({});
  });

  it("returns empty object when data has no relevant fields", () => {
    const result = sanitizePaymentDataForClient({
      id: "pi_abc123",
      client_secret: "pi_secret_abc",
      stripeAccount: "acct_abc123",
    });
    expect(result).toEqual({});
  });

  it("handles empty data object", () => {
    const result = sanitizePaymentDataForClient({});
    expect(result).toEqual({});
  });
});
