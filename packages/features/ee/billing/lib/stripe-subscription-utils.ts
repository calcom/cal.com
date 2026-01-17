import type { BillingPeriod } from "@calcom/prisma/enums";

type SubscriptionItemLike = {
  id: string;
  quantity?: number | null;
  price: {
    unit_amount: number | null;
    recurring: { interval: string } | null;
  };
};

type SubscriptionItems = SubscriptionItemLike[] | { data: SubscriptionItemLike[] };

export interface StripeSubscriptionLike {
  items: SubscriptionItems;
  current_period_start: number;
  current_period_end: number;
  trial_end: number | null;
}

export interface BillingData {
  billingPeriod: BillingPeriod;
  pricePerSeat: number | undefined;
  paidSeats: number | undefined;
  subscriptionStart: Date | undefined;
  subscriptionEnd: Date | undefined;
  subscriptionTrialEnd: Date | undefined;
}

const getSubscriptionItems = (subscription: StripeSubscriptionLike) =>
  Array.isArray(subscription.items) ? subscription.items : subscription.items.data;

export function extractBillingDataFromStripeSubscription(subscription: StripeSubscriptionLike): BillingData {
  const subscriptionItems = getSubscriptionItems(subscription);
  const primaryItem = subscriptionItems[0];

  const billingPeriod: BillingPeriod =
    primaryItem?.price.recurring?.interval === "year" ? "ANNUALLY" : "MONTHLY";

  const pricePerSeat = primaryItem?.price.unit_amount ?? undefined;

  const paidSeats = primaryItem?.quantity ?? undefined;

  const subscriptionStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : undefined;

  const subscriptionEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : undefined;

  const subscriptionTrialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined;

  return {
    billingPeriod,
    pricePerSeat,
    paidSeats,
    subscriptionStart,
    subscriptionEnd,
    subscriptionTrialEnd,
  };
}
