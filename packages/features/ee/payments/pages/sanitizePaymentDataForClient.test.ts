import { describe, expect, it } from "vitest";
import { z } from "zod";
import { sanitizePaymentDataForClient } from "./sanitizePaymentDataForClient";

/** Schemas mirroring what each payment component expects - used to verify sanitized data is usable */
const HitPayDataSchema: z.ZodType = z.object({
  id: z.string(),
  url: z.string(),
  defaultLink: z.string(),
  eventTypeSlug: z.string(),
  bookingUid: z.string(),
  email: z.string(),
  bookingUserName: z.string(),
});

const PayPalDataSchema: z.ZodType = z.object({
  order: z
    .object({
      id: z.string(),
      status: z.string(),
      links: z.array(
        z.object({
          href: z.string(),
          rel: z.string(),
          method: z.string(),
        })
      ),
    })
    .optional(),
  capture: z.object({}).optional(),
});

const BTCPayDataSchema: z.ZodType = z.object({
  invoice: z.object({ checkoutLink: z.string() }).required(),
});

const AlbyDataSchema: z.ZodType = z.object({
  invoice: z
    .object({
      paymentRequest: z.string(),
    })
    .required(),
});

const StripeDataSchema: z.ZodType = z.object({
  stripe_publishable_key: z.string().optional(),
  setupIntent: z.object({}).optional(),
});

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

  it("passes through HitPay required fields when appId is hitpay", () => {
    const hitpayData = {
      id: "pay_123",
      url: "https://securecheckout.hit-pay.com/checkout",
      defaultLink: "https://securecheckout.hit-pay.com/checkout",
      eventTypeSlug: "60min",
      bookingUid: "abc123",
      email: "booker@example.com",
      bookingUserName: "organizer",
    };
    const result = sanitizePaymentDataForClient(hitpayData, "hitpay");
    expect(result).toEqual(hitpayData);
  });

  it("passes through PayPal order and capture when appId is paypal", () => {
    const paypalData = {
      order: { id: "ord_123", status: "APPROVED", links: [] },
      capture: {},
    };
    const result = sanitizePaymentDataForClient(paypalData, "paypal");
    expect(result).toEqual(paypalData);
  });

  describe("payment app integration - sanitized data must parse for each component", () => {
    it("Stripe: sanitized data has stripe_publishable_key and optionally setupIntent, no secrets", () => {
      const rawStripeData = {
        id: "pi_abc123",
        object: "payment_intent",
        client_secret: "pi_secret_DO_NOT_LEAK",
        stripeAccount: "acct_xyz_SENSITIVE",
        stripe_publishable_key: "pk_live_abc123",
        metadata: {
          bookerEmail: "secret@example.com",
          bookerPhoneNumber: "+1234567890",
          bookerName: "John Doe",
        },
      };

      const sanitized = sanitizePaymentDataForClient(rawStripeData, "stripe");
      const parsed = StripeDataSchema.safeParse(sanitized);

      expect(parsed.success).toBe(true);
      expect(sanitized).toHaveProperty("stripe_publishable_key", "pk_live_abc123");
      expect(sanitized).not.toHaveProperty("client_secret");
      expect(sanitized).not.toHaveProperty("stripeAccount");
      expect(sanitized).not.toHaveProperty("metadata");
    });

    it("Stripe HOLD flow: preserves setupIntent existence as empty object", () => {
      const rawStripeData = {
        setupIntent: {
          id: "seti_123",
          client_secret: "seti_secret_LEAK",
          customer: "cus_abc",
          metadata: { bookerEmail: "secret@example.com" },
        },
        stripe_publishable_key: "pk_test_xyz",
        stripeAccount: "acct_xyz",
      };

      const sanitized = sanitizePaymentDataForClient(rawStripeData, "stripe");
      const parsed = StripeDataSchema.safeParse(sanitized);

      expect(parsed.success).toBe(true);
      expect(sanitized).toEqual({
        setupIntent: {},
        stripe_publishable_key: "pk_test_xyz",
      });
      expect(sanitized).not.toHaveProperty("stripeAccount");
    });

    it("HitPay: sanitized data parses and contains all required fields", () => {
      const rawHitPayData = {
        id: "pay_123",
        url: "https://securecheckout.hit-pay.com/checkout/xyz",
        defaultLink: "https://securecheckout.hit-pay.com/checkout",
        eventTypeSlug: "60min",
        bookingUid: "abc123",
        email: "booker@example.com",
        bookingUserName: "organizer",
        internalApiKey: "DO_NOT_SEND_TO_CLIENT",
        webhookSecret: "secret",
      };

      const sanitized = sanitizePaymentDataForClient(rawHitPayData, "hitpay");
      const parsed = HitPayDataSchema.safeParse(sanitized);

      expect(parsed.success).toBe(true);
      expect(sanitized).not.toHaveProperty("internalApiKey");
      expect(sanitized).not.toHaveProperty("webhookSecret");
      expect(parsed.success && parsed.data.url).toContain("hit-pay.com");
    });

    it("PayPal: sanitized data parses with order.links for approve link", () => {
      const rawPayPalData = {
        order: {
          id: "ord_123",
          status: "APPROVED",
          links: [{ href: "https://paypal.com/checkout/approve", rel: "approve", method: "GET" }],
        },
        capture: {},
        internalToken: "DO_NOT_SEND",
      };

      const sanitized = sanitizePaymentDataForClient(rawPayPalData, "paypal");
      const parsed = PayPalDataSchema.safeParse(sanitized);

      expect(parsed.success).toBe(true);
      const link = parsed.success && parsed.data.order?.links?.find((l) => l.rel === "approve");
      expect(link?.href).toBe("https://paypal.com/checkout/approve");
      expect(sanitized).not.toHaveProperty("internalToken");
    });

    it("BTCPayServer: sanitized data has invoice.checkoutLink", () => {
      const rawBTCPayData = {
        invoice: {
          id: "inv_btc_123",
          checkoutLink: "https://btcpay.example.com/i/abc123",
          status: "New",
          attendee: { name: "John", email: "john@example.com" },
        },
        webhookSecret: "secret",
      };

      const sanitized = sanitizePaymentDataForClient(rawBTCPayData, "btcpayserver");
      const parsed = BTCPayDataSchema.safeParse(sanitized);

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.invoice.checkoutLink).toBe("https://btcpay.example.com/i/abc123");
    });

    it("Alby: sanitized data has invoice.paymentRequest", () => {
      const rawAlbyData = {
        invoice: {
          paymentRequest: "lnbc1234567890abcdef",
          expiresAt: "2025-01-01T00:00:00Z",
          isPaid: false,
        },
        apiKey: "DO_NOT_SEND",
      };

      const sanitized = sanitizePaymentDataForClient(rawAlbyData, "alby");
      const parsed = AlbyDataSchema.safeParse(sanitized);

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.invoice.paymentRequest).toBe("lnbc1234567890abcdef");
      expect(sanitized).not.toHaveProperty("apiKey");
    });

    it("unknown appId falls back to Stripe-style sanitization", () => {
      const rawData = {
        stripe_publishable_key: "pk_live_xyz",
        client_secret: "pi_secret",
        someCustomField: "value",
      };

      const sanitized = sanitizePaymentDataForClient(rawData, "unknown-app");
      expect(sanitized).toHaveProperty("stripe_publishable_key", "pk_live_xyz");
      expect(sanitized).not.toHaveProperty("client_secret");
      expect(sanitized).not.toHaveProperty("someCustomField");
    });

    it("undefined appId (legacy Stripe) uses strict sanitization", () => {
      const rawData = {
        stripe_publishable_key: "pk_live_xyz",
        client_secret: "pi_secret",
        stripeAccount: "acct_123",
      };

      const sanitized = sanitizePaymentDataForClient(rawData, undefined);
      expect(Object.keys(sanitized)).toEqual(["stripe_publishable_key"]);
      expect(sanitized).not.toHaveProperty("client_secret");
      expect(sanitized).not.toHaveProperty("stripeAccount");
    });
  });
});
