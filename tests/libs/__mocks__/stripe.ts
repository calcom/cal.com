import type Stripe from "stripe";
import { vi } from "vitest";

export const mockStripeSubscription: Stripe.Subscription & { plan: Stripe.Plan } = {
  id: "sub_xxxxxxxxxxxxxxxxxxxxxxxx",
  object: "subscription",
  application: null,
  application_fee_percent: null,
  automatic_tax: { enabled: false },
  billing_cycle_anchor: 1718226165,
  billing_thresholds: null,
  cancel_at: 1749762165,
  cancel_at_period_end: true,
  canceled_at: 1718227398,
  collection_method: "charge_automatically",
  created: 1718226165,
  currency: "usd",
  current_period_end: 1749762165,
  current_period_start: 1718226165,
  customer: "cus_xxxxxxxxxxxxxx",
  days_until_due: null,
  default_payment_method: "pm_xxxxxxxxxxxxxxxxxxxxxxxx",
  default_source: null,
  default_tax_rates: [],
  description: null,
  discount: null,
  ended_at: 1749762165,
  items: {
    object: "list",
    data: [],
    has_more: false,
    url: "/v1/subscription_items?subscription=sub_xxxxxxxxxxxxxxxxxxxxxxxx",
  },
  latest_invoice: "in_xxxxxxxxxxxxxxxxxxxxxxxx",
  livemode: false,
  metadata: {},
  next_pending_invoice_item_invoice: null,
  pause_collection: null,
  payment_settings: {
    payment_method_options: {
      acss_debit: null,
      bancontact: null,
      card: { request_three_d_secure: "automatic" },
      customer_balance: null,
      konbini: null,
      us_bank_account: null,
    },
    payment_method_types: null,
    save_default_payment_method: "off",
  },
  pending_invoice_item_interval: null,
  pending_setup_intent: null,
  pending_update: null,
  plan: {
    id: "price_xxxxxxxxxxxxxxxxxxxxxxxx",
    object: "plan",
    active: true,
    aggregate_usage: null,
    amount: 14400,
    amount_decimal: "14400",
    billing_scheme: "per_unit",
    created: 1718225939,
    currency: "usd",
    interval: "year",
    interval_count: 1,
    livemode: false,
    metadata: {},
    nickname: null,
    product: "prod_xxxxxxxxxxxxxx",
    tiers_mode: null,
    transform_usage: null,
    trial_period_days: null,
    usage_type: "licensed",
  },
  schedule: null,
  start_date: 1718226165,
  status: "canceled",
  test_clock: "clock_xxxxxxxxxxxxxxxxxxxxxxxx",
  transfer_data: null,
  trial_end: null,
  trial_start: null,
};

interface MockStripeProps {
  subscriptions: {
    cancel: () => Promise<Stripe.Subscription>;
    update: () => Promise<Stripe.Subscription>;
    retrieve: () => Promise<Stripe.Subscription>;
  };
}

vi.mock("stripe", () => {
  return vi.fn(() => {
    return {
      subscriptions: {
        cancel: () => Promise.resolve(mockStripeSubscription),
        update: () => Promise.resolve(mockStripeSubscription),
        retrieve: () => Promise.resolve(mockStripeSubscription),
      },
    } as MockStripeProps;
  });
});
