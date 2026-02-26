import { describe, expect, it } from "vitest";
import { stripeInvalidRequestErrorSchema } from "./stripe-error";

describe("stripeInvalidRequestErrorSchema", () => {
  const validError = {
    name: "StripeInvalidRequestError",
    message: "No such customer",
    type: "StripeInvalidRequestError" as const,
    rawType: "invalid_request_error" as const,
    requestId: "req_abc123",
    headers: { "request-id": "req_abc123" },
    raw: { message: "No such customer" },
  };

  it("validates a complete Stripe invalid request error", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse({
      ...validError,
      code: "resource_missing",
      doc_url: "https://stripe.com/docs/error-codes/resource-missing",
      statusCode: 404,
      param: "customer",
      stack: "Error: No such customer\n    at ...",
    });
    expect(result.success).toBe(true);
  });

  it("validates with optional fields omitted", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });

  it("requires type to be exactly 'StripeInvalidRequestError'", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse({
      ...validError,
      type: "OtherError",
    });
    expect(result.success).toBe(false);
  });

  it("requires rawType to be exactly 'invalid_request_error'", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse({
      ...validError,
      rawType: "api_error",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse({
      name: "StripeInvalidRequestError",
      message: "error",
    });
    expect(result.success).toBe(false);
  });

  it("validates headers as Record<string, string>", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse({
      ...validError,
      headers: { key1: "val1", key2: "val2" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects headers with non-string values", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse({
      ...validError,
      headers: { key1: 123 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional code, doc_url, statusCode, param, stack", () => {
    const result = stripeInvalidRequestErrorSchema.safeParse(validError);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBeUndefined();
      expect(result.data.doc_url).toBeUndefined();
      expect(result.data.statusCode).toBeUndefined();
      expect(result.data.param).toBeUndefined();
      expect(result.data.stack).toBeUndefined();
    }
  });
});
