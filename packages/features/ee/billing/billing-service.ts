export interface BillingService {
  checkoutSessionIsPaid(paymentId: string): Promise<boolean>;
  handleSubscriptionCancel(subscriptionId: string): Promise<void>;
  handleSubscriptionCreation(subscriptionId: string): Promise<void>;
  handleSubscriptionUpdate(args: {
    subscriptionId: string;
    subscriptionItemId: string;
    membershipCount: number;
  }): Promise<void>;

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
  checkIfTeamHasActivePlan(subscriptionId: string): Promise<boolean>;
}
