import type Stripe from "stripe";
import { vi } from "vitest";

import { mockStripeSubscription } from "../mockData";

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
