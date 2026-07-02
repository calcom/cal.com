import process from "node:process";
import { describe, expect, it, vi } from "vitest";
import { getCheckoutIframeDomain } from "./getCheckoutIframeDomain";

describe("getCheckoutIframeDomain", () => {
  it("strips the Checkout V1 subdomain", () => {
    expect(getCheckoutIframeDomain("https://securecheckout.hit-pay.com/payment-request/@merchant/abc")).toBe(
      "hit-pay.com"
    );
  });

  it("strips the Checkout V2 subdomain", () => {
    expect(getCheckoutIframeDomain("https://checkout.hit-pay.com/payment-request/@merchant/abc")).toBe(
      "hit-pay.com"
    );
  });

  it("strips the Checkout V1 sandbox subdomain", () => {
    expect(getCheckoutIframeDomain("https://securecheckout.sandbox.hit-pay.com/payment-request/abc")).toBe(
      "sandbox.hit-pay.com"
    );
  });

  it("strips the Checkout V2 sandbox subdomain", () => {
    expect(getCheckoutIframeDomain("https://checkout.sandbox.hit-pay.com/payment-request/abc")).toBe(
      "sandbox.hit-pay.com"
    );
  });

  it("returns the hostname unchanged when there is no checkout subdomain", () => {
    expect(getCheckoutIframeDomain("https://hit-pay.com/payment-request/abc")).toBe("hit-pay.com");
  });

  it("only strips a leading checkout subdomain label", () => {
    expect(getCheckoutIframeDomain("https://pay.checkout.hit-pay.com/abc")).toBe("pay.checkout.hit-pay.com");
  });

  it("returns undefined for a malformed URL", () => {
    expect(getCheckoutIframeDomain("not-a-url")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getCheckoutIframeDomain("")).toBeUndefined();
  });

  it("returns undefined for a host outside HitPay's known domains", () => {
    // A resolved host must never escape hit-pay.com / sandbox.hit-pay.com.
    expect(getCheckoutIframeDomain("https://checkout.evil.com/payment-request/abc")).toBeUndefined();
  });

  it("never regresses to the original 23-character substring bug", () => {
    // Original bug: a fixed 23-char slice truncated Checkout V2 hostnames into "y.com".
    expect(getCheckoutIframeDomain("https://checkout.hit-pay.com/payment-request/abc")).not.toBe("y.com");
  });

  it("does not crash at import time when an env-configured HitPay URL is malformed", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_HITPAY_PRODUCTION = "not-a-valid-url";
    const fresh = await import("./getCheckoutIframeDomain");
    delete process.env.NEXT_PUBLIC_API_HITPAY_PRODUCTION;

    // the import itself must not throw, and the other (still-valid) host must still work
    expect(fresh.getCheckoutIframeDomain("https://checkout.sandbox.hit-pay.com/payment-request/abc")).toBe(
      "sandbox.hit-pay.com"
    );
  });
});
