import Stripe from "stripe";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { StripeBillingService } from "./stripe-billling-service";

vi.mock("stripe");

describe("StripeBillingService", () => {
  let stripeBillingService: StripeBillingService;
  let stripeMock: any;

  beforeEach(() => {
    stripeMock = {
      subscriptions: {
        cancel: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
      },
      checkout: {
        sessions: {
          retrieve: vi.fn(),
        },
      },
    };
    (Stripe as any).mockImplementation(() => stripeMock);
    stripeBillingService = new StripeBillingService();
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
