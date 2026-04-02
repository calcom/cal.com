import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StripeBillingService } from "./StripeBillingService";

describe("StripeBillingService", () => {
  let stripeBillingService: StripeBillingService;
  let stripeMock: Partial<Stripe>;

  beforeEach(() => {
    stripeMock = {
      subscriptions: {
        cancel: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
      } as Partial<Stripe.SubscriptionsResource>,
      checkout: {
        sessions: {
          retrieve: vi.fn(),
        } as Partial<Stripe.Checkout.SessionsResource>,
      } as Partial<Stripe.CheckoutResource>,
    };
    stripeBillingService = new StripeBillingService(stripeMock as Stripe);
  });

  it("should cancel a subscription", async () => {
    const subscriptionId = "sub_123";
    await stripeBillingService.handleSubscriptionCancel(subscriptionId);
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId);
  });

  it("should update a subscription", async () => {
    const args = {
      subscriptionId: "sub_123",
      subscriptionItemId: "item_123",
      membershipCount: 5,
    };
    stripeMock.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [{ id: "item_123", quantity: 3 }],
      },
    });
    await stripeBillingService.handleSubscriptionUpdate(args);
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith(args.subscriptionId);
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(args.subscriptionId, {
      items: [{ quantity: args.membershipCount, id: args.subscriptionItemId }],
    });

    await stripeBillingService.handleSubscriptionUpdate({
      ...args,
      prorationBehavior: "none",
    });
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(args.subscriptionId, {
      items: [{ quantity: args.membershipCount, id: args.subscriptionItemId }],
      proration_behavior: "none",
    });
  });

  it("should throw an error if subscription item is not found", async () => {
    const args = {
      subscriptionId: "sub_123",
      subscriptionItemId: "item_123",
      membershipCount: 5,
    };
    stripeMock.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [],
      },
    });
    await expect(stripeBillingService.handleSubscriptionUpdate(args)).rejects.toThrow(
      "Subscription not found"
    );
  });

  it("should return true if checkout session is paid", async () => {
    const paymentId = "pay_123";
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "paid",
    });
    const result = await stripeBillingService.checkoutSessionIsPaid(paymentId);
    expect(result).toBe(true);
    expect(stripeMock.checkout.sessions.retrieve).toHaveBeenCalledWith(paymentId);
  });

  it("should return false if checkout session is not paid", async () => {
    const paymentId = "pay_123";
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "unpaid",
    });
    const result = await stripeBillingService.checkoutSessionIsPaid(paymentId);
    expect(result).toBe(false);
    expect(stripeMock.checkout.sessions.retrieve).toHaveBeenCalledWith(paymentId);
  });
});
