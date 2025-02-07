import Stripe from "stripe";

import type { BillingService } from "./billing-service";

export class StripeBillingService implements BillingService {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
      apiVersion: "2020-08-27",
    });
  }

  async createCustomer(args: Parameters<BillingService["createCustomer"]>[0]) {
    const { email, metadata } = args;
    const customer = await this.stripe.customers.create({
      email,
      metadata: {
        email,
        ...metadata,
      },
    });
    return { stripeCustomerId: customer.id };
  }

  async createPaymentIntent(args: Parameters<BillingService["createPaymentIntent"]>[0]) {
    const { customerId, amount, metadata } = args;
    const paymentIntent = await this.stripe.paymentIntents.create({
      customer: customerId,
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    };
  }

  async createSubscriptionCheckout(args: Parameters<BillingService["createSubscriptionCheckout"]>[0]) {
    const { customerId, successUrl, cancelUrl, priceId, quantity, metadata, mode = "subscription" } = args;

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      mode,
      metadata,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async createPrice(args: Parameters<BillingService["createPrice"]>[0]) {
    const { amount, currency, interval, nickname, metadata } = args;

    const price = await this.stripe.prices.create({
      unit_amount: amount,
      currency,
      recurring: {
        interval,
      },
      product_data: {
        name: nickname || `Custom ${interval}ly price`,
      },
      metadata,
    });

    return {
      priceId: price.id,
    };
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
