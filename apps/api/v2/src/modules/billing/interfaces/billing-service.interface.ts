import { PlatformPlan } from "@/modules/billing/types";
import Stripe from "stripe";

export interface IBillingService {
  getBillingData(teamId: number): Promise<{
    team: any;
    status: "valid" | "no_subscription" | "no_billing";
    plan: string;
  }>;
  createTeamBilling(teamId: number): Promise<string>;
  redirectToSubscribeCheckout(teamId: number, plan: PlatformPlan, customerId?: string): Promise<string>;
  updateSubscriptionForTeam(teamId: number, plan: PlatformPlan): Promise<string>;
  cancelTeamSubscription(teamId: number): Promise<void>;
  handleStripeSubscriptionDeleted(event: Stripe.Event): Promise<void>;
  handleStripePaymentSuccess(event: Stripe.Event): Promise<void>;
  handleStripePaymentFailed(event: Stripe.Event): Promise<void>;
  handleStripePaymentPastDue(event: Stripe.Event): Promise<void>;
  handleStripeCheckoutEvents(event: Stripe.Event): Promise<void>;
  handleStripeSubscriptionForActiveManagedUsers(event: Stripe.Event): Promise<void>;
  getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null;
  getCustomerIdFromInvoice(invoice: Stripe.Invoice): string | null;
  stripeService: any;
}
