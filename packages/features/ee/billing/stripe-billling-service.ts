import Stripe from "stripe";

import type { BillingService } from "./billing-service";

export class StripeBillingService implements BillingService {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
      apiVersion: "2020-08-27",
    });
  }
  async handleSubscriptionCreation(subscriptionId: string) {
    throw new Error("Method not implemented.");
  }
  async handleSubscriptionCancel(subscriptionId: string) {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }
}
