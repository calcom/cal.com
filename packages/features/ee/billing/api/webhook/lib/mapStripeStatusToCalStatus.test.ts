import { describe, it, expect, vi } from "vitest";

import { SubscriptionStatus } from "../../../repository/IBillingRepository";
import { mapStripeStatusToCalStatus } from "./mapStripeStatusToCalStatus";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
    }),
  },
}));

describe("mapStripeStatusToCalStatus", () => {
  it("should map 'active' to ACTIVE", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "active",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.ACTIVE);
  });

  it("should map 'past_due' to PAST_DUE", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "past_due",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.PAST_DUE);
  });

  it("should map 'canceled' to CANCELLED", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "canceled",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.CANCELLED);
  });

  it("should map 'cancelled' to CANCELLED", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "cancelled",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.CANCELLED);
  });

  it("should map 'trialing' to TRIALING", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "trialing",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.TRIALING);
  });

  it("should map 'incomplete' to INCOMPLETE", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "incomplete",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.INCOMPLETE);
  });

  it("should map 'incomplete_expired' to INCOMPLETE_EXPIRED", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "incomplete_expired",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.INCOMPLETE_EXPIRED);
  });

  it("should map 'unpaid' to UNPAID", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "unpaid",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.UNPAID);
  });

  it("should map 'paused' to PAUSED", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "paused",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.PAUSED);
  });

  it("should default to ACTIVE for unknown status", () => {
    const result = mapStripeStatusToCalStatus({
      stripeStatus: "unknown_status",
      subscriptionId: "sub_123",
    });
    expect(result).toBe(SubscriptionStatus.ACTIVE);
  });
});
