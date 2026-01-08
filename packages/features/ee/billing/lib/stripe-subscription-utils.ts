import type Stripe from "stripe";

export interface StripeSubscriptionBillingData {
  billingPeriod: "MONTHLY" | "ANNUALLY";
  pricePerSeat: number | undefined;
  paidSeats: number | undefined;
}

export function extractBillingDataFromStripeSubscription(
  subscription: Stripe.Subscription
): StripeSubscriptionBillingData {
  const firstItem = subscription.items.data[0];

  const billingPeriod = firstItem?.price.recurring?.interval === "year" ? "ANNUALLY" : "MONTHLY";
  const pricePerSeat = firstItem?.price.unit_amount ? firstItem.price.unit_amount / 100 : undefined;
  const paidSeats = firstItem?.quantity || undefined;

  return {
    billingPeriod,
    pricePerSeat,
    paidSeats,
  };
}
