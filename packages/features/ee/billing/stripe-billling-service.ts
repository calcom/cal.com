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

  async createOneTimeCheckout(args: {
    priceId: string;
    quantity: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const { priceId, quantity, successUrl, cancelUrl, metadata } = args;

    const session = await this.stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity }],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
      invoice_creation: {
        enabled: true,
      },
    } as any);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async createSubscriptionCheckout(args: Parameters<BillingService["createSubscriptionCheckout"]>[0]) {
    const {
      customerId,
      successUrl,
      cancelUrl,
      priceId,
      quantity,
      metadata,
      mode = "subscription",
      allowPromotionCodes = true,
      customerUpdate,
      automaticTax,
      discounts,
      subscriptionData,
    } = args;

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
      allow_promotion_codes: allowPromotionCodes,
      customer_update: customerUpdate,
      automatic_tax: automaticTax,
      discounts,
      subscription_data: subscriptionData,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async createPrice(args: Parameters<BillingService["createPrice"]>[0]) {
    const { amount, currency, interval, productId, nickname, metadata } = args;

    const price = await this.stripe.prices.create({
      nickname,
      unit_amount: amount,
      currency,
      recurring: {
        interval,
      },
      product: productId,
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

  async handleEndTrial(subscriptionId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status !== "trialing") {
      return; // Do nothing if not in trial
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      trial_end: "now",
    });
  }

  async checkoutSessionIsPaid(paymentId: string) {
    const checkoutSession = await this.stripe.checkout.sessions.retrieve(paymentId);
    return checkoutSession.payment_status === "paid";
  }
  async getSubscriptionStatus(subscriptionId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription || !subscription.status) return null;

    return subscription.status;
  }

  async getCheckoutSession(checkoutSessionId: string) {
    const checkoutSession = await this.stripe.checkout.sessions.retrieve(checkoutSessionId);
    return checkoutSession;
  }

  async getCustomer(customerId: string) {
    const customer = await this.stripe.customers.retrieve(customerId);
    return customer;
  }

  async getSubscriptions(customerId: string) {
    const subscriptions = await this.stripe.subscriptions.list({ customer: customerId });
    return subscriptions.data;
  }

  async updateCustomer(args: Parameters<BillingService["updateCustomer"]>[0]) {
    const { customerId, email, userId } = args;
    const metadata: { email?: string; userId?: number } = {};
    if (email) metadata.email = email;
    if (userId) metadata.userId = userId;
    await this.stripe.customers.update(customerId, { metadata });
  }

  async getPrice(priceId: string) {
    const price = await this.stripe.prices.retrieve(priceId);
    return price;
  }
}
