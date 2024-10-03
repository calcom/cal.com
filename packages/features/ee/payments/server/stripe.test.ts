import { describe, expect, test } from "vitest";

import stripe from "./stripe";

describe("stripe", () => {
  test("checkout.sessions.create", async () => {
    const checkout = await stripe.checkout.sessions.create({});
    expect(checkout.id).toMatch(/cs_test_/);
  });
  test("checkout.sessions.retrieve", async () => {
    const checkout = await stripe.checkout.sessions.create({});
    const retrievedCheckout = await stripe.checkout.sessions.retrieve(checkout.id);
    expect(retrievedCheckout.id).toBe(checkout.id);
  });
});
