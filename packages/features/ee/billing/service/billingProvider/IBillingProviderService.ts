import type Stripe from "stripe";
import type { SubscriptionStatus } from "../../repository/billing/IBillingRepository";

export interface IBillingProviderService {
  checkoutSessionIsPaid(paymentId: string): Promise<boolean>;
  handleSubscriptionCancel(subscriptionId: string): Promise<void>;
  handleSubscriptionCreation(subscriptionId: string): Promise<void>;
  handleSubscriptionUpdate(args: {
    subscriptionId: string;
    subscriptionItemId: string;
    membershipCount: number;
    prorationBehavior?: "none" | "create_prorations" | "always_invoice";
  }): Promise<void>;
  handleEndTrial(subscriptionId: string): Promise<void>;

  // Customer management
  createCustomer(args: {
    email: string;
    metadata?: Record<string, string>;
  }): Promise<{ stripeCustomerId: string }>;
  createPaymentIntent(args: {
    customerId: string;
    amount: number;
    metadata?: Record<string, string | number>;
  }): Promise<{ id: string; client_secret: string | null }>;

  // Subscription management
  createSubscriptionCheckout(args: {
    customerId: string;
    successUrl: string;
    cancelUrl: string;
    priceId: string;
    quantity: number;
    metadata?: Record<string, string | number>;
    mode?: "subscription" | "setup" | "payment";
    allowPromotionCodes?: boolean;
    customerUpdate?: {
      address?: "auto" | "never";
    };
    automaticTax?: {
      enabled: boolean;
    };
    discounts?: Array<{
      coupon: string;
    }>;
    subscriptionData?: {
      metadata?: Record<string, string | number>;
      trial_period_days?: number;
    };
  }): Promise<{ checkoutUrl: string | null; sessionId: string }>;

  // Price management
  createPrice(args: {
    amount: number;
    currency: string;
    interval: "month" | "year";
    nickname?: string;
    productId: string;
    metadata?: Record<string, string | number>;
  }): Promise<{ priceId: string }>;
  getPrice(priceId: string): Promise<Stripe.Price | null>;
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus | null>;

  getCheckoutSession(checkoutSessionId: string): Promise<Stripe.Checkout.Session | null>;
  getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer | null>;
  getSubscriptions(customerId: string): Promise<Stripe.Subscription[] | null>;
  updateCustomer(args: { customerId: string; email: string; userId?: number }): Promise<void>;

  // Invoice management
  createInvoiceItem(args: {
    customerId: string;
    amount: number;
    currency: string;
    description: string;
    subscriptionId?: string;
    invoiceId?: string;
    metadata?: Record<string, string>;
  }): Promise<{ invoiceItemId: string }>;

  deleteInvoiceItem(invoiceItemId: string): Promise<void>;

  createInvoice(args: {
    customerId: string;
    autoAdvance: boolean;
    collectionMethod?: "charge_automatically" | "send_invoice";
    daysUntilDue?: number;
    pendingInvoiceItemsBehavior?: "exclude" | "include";
    subscriptionId?: string;
    metadata?: Record<string, string>;
  }): Promise<{ invoiceId: string }>;

  finalizeInvoice(invoiceId: string): Promise<{ invoiceUrl: string | null }>;

  voidInvoice(invoiceId: string): Promise<void>;

  getPaymentIntentFailureReason(paymentIntentId: string): Promise<string | null>;

  hasDefaultPaymentMethod(args: { customerId: string; subscriptionId?: string }): Promise<boolean>;

  // Usage-based billing
  createSubscriptionUsageRecord(args: {
    subscriptionId: string;
    action: "increment" | "set";
    quantity: number;
  }): Promise<void>;

  // Subscription queries
  getSubscription(subscriptionId: string): Promise<{
    items: Array<{
      id: string;
      quantity: number;
      price: {
        unit_amount: number | null;
        recurring: {
          interval: string;
        } | null;
      };
    }>;
    customer: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    trial_end: number | null;
  } | null>;

  // Invoice listing
  listInvoices(args: {
    customerId: string;
    subscriptionId?: string;
    limit: number;
    startingAfter?: string;
    createdGte?: number;
    createdLte?: number;
  }): Promise<{
    invoices: Array<{
      id: string;
      number: string | null;
      created: number;
      amountDue: number;
      amountPaid: number;
      currency: string;
      status: string | null;
      hostedInvoiceUrl: string | null;
      invoicePdf: string | null;
      lineItems: Array<{
        id: string;
        description: string | null;
        amount: number;
        quantity: number | null;
      }>;
      description: string | null;
      paymentMethod: {
        type: string;
        card?: {
          last4: string;
          brand: string;
        };
      } | null;
    }>;
    hasMore: boolean;
  }>;
}
