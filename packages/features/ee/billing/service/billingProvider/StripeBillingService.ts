import logger from "@calcom/lib/logger";
import type Stripe from "stripe";
import { SubscriptionStatus } from "../../repository/billing/IBillingRepository";
import type { IBillingProviderService } from "./IBillingProviderService";

const log = logger.getSubLogger({ prefix: ["StripeBillingService"] });

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
    const { subscriptionId, subscriptionItemId, membershipCount, prorationBehavior } = args;
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionQuantity = subscription.items.data.find(
      (sub) => sub.id === subscriptionItemId
    )?.quantity;
    if (!subscriptionQuantity) throw new Error("Subscription not found");
    await this.stripe.subscriptions.update(subscriptionId, {
      items: [{ quantity: membershipCount, id: subscriptionItemId }],
      ...(prorationBehavior ? { proration_behavior: prorationBehavior } : {}),
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

  async createInvoiceItem(args: Parameters<IBillingProviderService["createInvoiceItem"]>[0]) {
    const { customerId, amount, currency, description, subscriptionId, invoiceId, metadata } = args;
    const invoiceItem = await this.stripe.invoiceItems.create({
      customer: customerId,
      amount,
      currency,
      description,
      invoice: invoiceId,
      subscription: subscriptionId,
      metadata,
    });

    return { invoiceItemId: invoiceItem.id };
  }

  async deleteInvoiceItem(invoiceItemId: string) {
    await this.stripe.invoiceItems.del(invoiceItemId);
  }

  async createInvoice(args: Parameters<IBillingProviderService["createInvoice"]>[0]) {
    const {
      customerId,
      autoAdvance,
      collectionMethod,
      daysUntilDue,
      pendingInvoiceItemsBehavior,
      subscriptionId,
      metadata,
    } = args;
    const invoice = await this.stripe.invoices.create({
      customer: customerId,
      auto_advance: autoAdvance,
      collection_method: collectionMethod,
      ...(pendingInvoiceItemsBehavior && !subscriptionId
        ? { pending_invoice_items_behavior: pendingInvoiceItemsBehavior }
        : {}),
      subscription: subscriptionId,
      // days_until_due is required for send_invoice collection method
      ...(collectionMethod === "send_invoice" && { days_until_due: daysUntilDue ?? 30 }),
      metadata,
    });

    return { invoiceId: invoice.id };
  }

  async finalizeInvoice(invoiceId: string) {
    const invoice = await this.stripe.invoices.finalizeInvoice(invoiceId);
    return { invoiceUrl: invoice.hosted_invoice_url ?? null };
  }

  async voidInvoice(invoiceId: string) {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      // Can only void invoices that are open or uncollectible
      if (invoice.status === "open" || invoice.status === "uncollectible") {
        await this.stripe.invoices.voidInvoice(invoiceId);
      } else if (invoice.status === "draft") {
        // Delete draft invoices instead of voiding
        await this.stripe.invoices.del(invoiceId);
      }
      // If paid or void, no action needed
    } catch (error) {
      log.warn("Failed to void invoice", { invoiceId, error });
      throw error;
    }
  }

  async getPaymentIntentFailureReason(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.last_payment_error?.message ?? null;
    } catch (error) {
      log.warn("Failed to retrieve payment intent failure reason", { paymentIntentId, error });
      return null;
    }
  }

  async hasDefaultPaymentMethod(args: Parameters<IBillingProviderService["hasDefaultPaymentMethod"]>[0]) {
    const { customerId, subscriptionId } = args;
    const subscription = subscriptionId ? await this.stripe.subscriptions.retrieve(subscriptionId) : null;

    const subscriptionDefault = subscription
      ? typeof subscription.default_payment_method === "string"
        ? subscription.default_payment_method
        : subscription.default_payment_method?.id
      : null;

    if (subscriptionDefault) {
      return true;
    }

    const customer = await this.stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return false;
    }

    const customerDefault =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id;

    return Boolean(customerDefault);
  }

  async createSubscriptionUsageRecord(
    args: Parameters<IBillingProviderService["createSubscriptionUsageRecord"]>[0]
  ) {
    const { subscriptionId, action, quantity } = args;
    const usageLog = logger.getSubLogger({ prefix: ["createSubscriptionUsageRecord"] });

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription?.id) {
      usageLog.error(`Failed to retrieve stripe subscription (${subscriptionId})`);
      throw new Error(`Failed to retrieve stripe subscription (${subscriptionId})`);
    }

    const meteredItem = subscription.items.data.find(
      (item) => item.price?.recurring?.usage_type === "metered"
    );
    if (!meteredItem) {
      usageLog.error(`Stripe subscription (${subscriptionId}) is not usage based`);
      throw new Error(`Stripe subscription (${subscriptionId}) is not usage based`);
    }

    await this.stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
      action,
      quantity,
      timestamp: "now",
    });

    usageLog.info(`Created usage record for subscription ${subscriptionId}`, {
      subscriptionId,
      itemId: meteredItem.id,
      action,
      quantity,
    });
  }

  async getSubscription(subscriptionId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription) return null;

    return {
      items: subscription.items.data.map((item) => ({
        id: item.id,
        quantity: item.quantity || 0,
        price: {
          unit_amount: item.price.unit_amount,
          recurring: item.price.recurring,
        },
      })),
      customer: subscription.customer as string,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      trial_end: subscription.trial_end,
    };
  }

  async listInvoices(args: {
    customerId: string;
    subscriptionId?: string;
    limit: number;
    startingAfter?: string;
    createdGte?: number;
    createdLte?: number;
  }) {
    const { customerId, subscriptionId, limit, startingAfter, createdGte, createdLte } = args;

    const invoicesResponse = await this.stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      limit,
      starting_after: startingAfter,
      expand: ["data.default_payment_method"],
      ...(createdGte || createdLte
        ? {
            created: {
              ...(createdGte ? { gte: createdGte } : {}),
              ...(createdLte ? { lte: createdLte } : {}),
            },
          }
        : {}),
    });

    return {
      invoices: invoicesResponse.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        created: invoice.created,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        invoicePdf: invoice.invoice_pdf ?? null,
        lineItems: invoice.lines.data.map((line) => ({
          id: line.id,
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
        })),
        description: invoice.description,
        paymentMethod: this.extractPaymentMethod(
          invoice.default_payment_method as Stripe.PaymentMethod | null
        ),
      })),
      hasMore: invoicesResponse.has_more,
    };
  }

  private extractPaymentMethod(pm: Stripe.PaymentMethod | string | null): {
    type: string;
    card?: { last4: string; brand: string };
  } | null {
    if (!pm || typeof pm === "string") return null;
    return {
      type: pm.type,
      card: pm.card ? { last4: pm.card.last4, brand: pm.card.brand } : undefined,
    };
  }
}
