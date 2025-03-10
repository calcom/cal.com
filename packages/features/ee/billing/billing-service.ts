import type Stripe from "stripe";

export interface BillingService {
  checkoutSessionIsPaid(paymentId: string): Promise<boolean>;
  handleSubscriptionCancel(subscriptionId: string): Promise<void>;
  handleSubscriptionCreation(subscriptionId: string): Promise<void>;
  handleSubscriptionUpdate(args: {
    subscriptionId: string;
    subscriptionItemId: string;
    membershipCount: number;
  }): Promise<void>;
  getSubscriptionStatus(subscriptionId: string): Promise<Stripe.Subscription.Status | null>;
}
