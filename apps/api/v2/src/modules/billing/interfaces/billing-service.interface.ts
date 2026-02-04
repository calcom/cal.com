import { PlatformPlan } from "@/modules/billing/types";
import type { StripeService } from "@/modules/stripe/stripe.service";
import Stripe from "stripe";

import { PlatformBilling, Team } from "@calcom/prisma/client";

export type BillingData = {
  team: (Team & { platformBilling: PlatformBilling | null }) | null;
  status: "valid" | "no_subscription" | "no_billing";
  plan: PlatformPlan | "none";
};

export interface IBillingService {
  getBillingData(teamId: number): Promise<BillingData>;
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
  stripeService: StripeService;
}
