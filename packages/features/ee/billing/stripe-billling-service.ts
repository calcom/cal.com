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
  async handleSubscriptionUpdate(args: Parameters<BillingService["handleSubscriptionUpdate"]>[0]) {
    const { subscriptionId, subscriptionItemId, membershipCount } = args;
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionQuantity = subscription.items.data.find(
      (sub) => sub.id === subscriptionItemId
    )?.quantity;
    if (!subscriptionQuantity) throw new Error("Subscription not found");
    await this.stripe.subscriptions.update(subscriptionId, {
      items: [{ quantity: membershipCount, id: subscriptionItemId }],
    });
  }
  async checkoutSessionIsPaid(paymentId: string) {
    const checkoutSession = await this.stripe.checkout.sessions.retrieve(paymentId);
    return checkoutSession.payment_status === "paid";
  }
  async checkIfTeamHasActivePlan(subscriptionId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription || !subscription.status) return false;

    return subscription.status === "active" || subscription.status === "past_due";
  }
}
