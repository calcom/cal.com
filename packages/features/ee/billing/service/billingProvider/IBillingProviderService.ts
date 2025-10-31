import type Stripe from "stripe";

import { SubscriptionStatus } from "../../repository/billing/IBillingRepository";

export interface IBillingProviderService {
  checkoutSessionIsPaid(paymentId: string): Promise<boolean>;
  handleSubscriptionCancel(subscriptionId: string): Promise<void>;
  handleSubscriptionCreation(subscriptionId: string): Promise<void>;
  handleSubscriptionUpdate(args: {
    subscriptionId: string;
    subscriptionItemId: string;
    membershipCount: number;
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
}
