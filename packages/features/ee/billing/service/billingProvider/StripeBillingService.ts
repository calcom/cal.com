import type Stripe from "stripe";

import logger from "@calcom/lib/logger";

import { SubscriptionStatus } from "../../repository/billing/IBillingRepository";
import type { IBillingProviderService } from "./IBillingProviderService";

export class StripeBillingService implements IBillingProviderService {
  constructor(private stripe: Stripe) {}

  async createCustomer(args: Parameters<IBillingProviderService["createCustomer"]>[0]) {
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

  async createPaymentIntent(args: Parameters<IBillingProviderService["createPaymentIntent"]>[0]) {
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
    allowPromotionCodes?: boolean;
  }) {
    const { priceId, quantity, successUrl, cancelUrl, metadata, allowPromotionCodes = true } = args;

    const session = await this.stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity }],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
      allow_promotion_codes: allowPromotionCodes,
      invoice_creation: {
        enabled: true,
      },
      // eslint-disable-next-line
    } as any);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async createSubscriptionCheckout(
    args: Parameters<IBillingProviderService["createSubscriptionCheckout"]>[0]
  ) {
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

  async createPrice(args: Parameters<IBillingProviderService["createPrice"]>[0]) {
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
    throw new Error(`Method not implemented for subscription id ${subscriptionId}`);
  }

  async handleSubscriptionCancel(subscriptionId: string) {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async handleSubscriptionUpdate(args: Parameters<IBillingProviderService["handleSubscriptionUpdate"]>[0]) {
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

    return this.mapStripeStatusToCalStatus({
      stripeStatus: subscription.status,
      subscriptionId,
    });
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

  async updateCustomer(args: Parameters<IBillingProviderService["updateCustomer"]>[0]) {
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

  extractSubscriptionDates(subscription: {
    start_date: number;
    trial_end?: number | null;
    cancel_at?: number | null;
  }) {
    // Stripe returns dates as unix time in seconds but Date() expects milliseconds
    const subscriptionStart = new Date(subscription.start_date * 1000);
    const subscriptionTrialEnd = subscription?.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const subscriptionEnd = subscription?.cancel_at ? new Date(subscription.cancel_at * 1000) : null;

    return { subscriptionStart, subscriptionTrialEnd, subscriptionEnd };
  }

  mapStripeStatusToCalStatus({
    stripeStatus,
    subscriptionId,
  }: {
    stripeStatus: string;
    subscriptionId: string;
  }) {
    const log = logger.getSubLogger({ prefix: ["mapStripeStatusToCalStatus"] });
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELLED,
      cancelled: SubscriptionStatus.CANCELLED,
      trialing: SubscriptionStatus.TRIALING,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      unpaid: SubscriptionStatus.UNPAID,
      paused: SubscriptionStatus.PAUSED,
    };

    const status = statusMap[stripeStatus];
    if (!status) {
      log.warn(`Unhandled status for ${stripeStatus} and sub id ${subscriptionId}`);
    }

    return status || SubscriptionStatus.ACTIVE;
  }
}
