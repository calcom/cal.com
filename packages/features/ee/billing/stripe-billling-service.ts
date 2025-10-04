/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable turbo/no-undeclared-env-vars */
import Stripe from "stripe";

export class StripeBillingService {
  private stripe: Stripe;
  constructor(apiKey?: string) {
    this.stripe = new Stripe(apiKey || (process.env.STRIPE_SECRET_KEY as string), {
      apiVersion: "2020-08-27",
    });
  }

  async createCustomer(args: any) {
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

  async createPaymentIntent(args: any) {
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
    } as never);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async createSubscriptionCheckout(args: any) {
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

  async createPrice(args: any) {
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

  async handleSubscriptionCreation(_args: any) {
    throw new Error("Method not implemented.");
  }

  async handleSubscriptionCancel(subscriptionId: string) {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async handleSubscriptionUpdate(args: any) {
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

  async updateCustomer(args: any) {
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

  async createAutoRechargePaymentIntent({
    customerId,
    amount, // quantity of credits to buy
    metadata,
  }: {
    customerId: string;
    amount: number;
    metadata: {
      creditBalanceId: string;
      teamId: string;
      userId: string;
      autoRecharge: string;
    };
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const creditsPriceId = process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID;
      if (!creditsPriceId) {
        return { success: false, error: "CREDITS price not configured" };
      }
      const price = await this.stripe.prices.retrieve(creditsPriceId);
      const unitAmount = price.unit_amount;
      if (!unitAmount) {
        return { success: false, error: "Unit amount missing on credits price" };
      }
      const totalAmount = unitAmount * amount;

      // Get customer's payment methods
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      if (!paymentMethods.data.length) {
        return { success: false, error: "No payment methods found for customer" };
      }

      // Use default payment method if set; else first available
      const customer = await this.stripe.customers.retrieve(customerId);
      const defaultPm = (customer as Stripe.Customer).invoice_settings?.default_payment_method as
        | string
        | null;
      const defaultPaymentMethod = defaultPm ?? paymentMethods.data[0].id;

      // Create and confirm a payment intent
      await this.stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        customer: customerId,
        payment_method: defaultPaymentMethod,
        off_session: true,
        confirm: true,
        error_on_requires_action: true,
        metadata,
      });

      return { success: true };
    } catch (error) {
      console.error("Error processing auto-recharge payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
