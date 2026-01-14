import type Stripe from "stripe";
import type { BillingPeriod } from "@calcom/prisma/enums";

export interface BillingData {
  billingPeriod: BillingPeriod;
  pricePerSeat: number | undefined;
  paidSeats: number | undefined;
}

export function extractBillingDataFromStripeSubscription(subscription: Stripe.Subscription): BillingData {
  const billingPeriod: BillingPeriod =
    subscription.items.data[0]?.price.recurring?.interval === "year" ? "ANNUALLY" : "MONTHLY";

  const pricePerSeat = subscription.items.data[0]?.price.unit_amount ?? undefined;

  const paidSeats = subscription.items.data[0]?.quantity ?? undefined;

  return {
    billingPeriod,
    pricePerSeat,
    paidSeats,
  };
}
