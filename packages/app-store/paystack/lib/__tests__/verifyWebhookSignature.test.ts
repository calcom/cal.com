import crypto from "crypto";

import { describe, it, expect } from "vitest";

import { verifyWebhookSignature } from "../verifyWebhookSignature";

describe("verifyWebhookSignature", () => {
  const secretKey = "sk_test_secretkey123";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "ref123" } });
  const validSignature = crypto.createHmac("sha512", secretKey).update(body).digest("hex");

  it("returns true for valid signature", () => {
    expect(verifyWebhookSignature(body, validSignature, secretKey)).toBe(true);
  });

  it("returns false for tampered body", () => {
    const tamperedBody = JSON.stringify({ event: "charge.success", data: { reference: "TAMPERED" } });
    expect(verifyWebhookSignature(tamperedBody, validSignature, secretKey)).toBe(false);
  });

  it("returns false for wrong secret key", () => {
    expect(verifyWebhookSignature(body, validSignature, "wrong_secret")).toBe(false);
  });

  it("returns false for empty signature", () => {
    expect(verifyWebhookSignature(body, "", secretKey)).toBe(false);
  });
});
