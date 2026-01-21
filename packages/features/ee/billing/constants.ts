/**
 * Stripe checkout session metadata types
 * Used to identify the type of subscription/purchase in webhook handlers
 */
import process from "node:process";
export const CHECKOUT_SESSION_TYPES = {
  PHONE_NUMBER_SUBSCRIPTION: "phone_number_subscription",
  TEAM_CREATION: "team_creation",
} as const;

export type CheckoutSessionType = (typeof CHECKOUT_SESSION_TYPES)[keyof typeof CHECKOUT_SESSION_TYPES];

export const BILLING_PLANS = {
  INDIVIDUALS: "INDIVIDUALS",
  TEAMS: "TEAMS",
  ORGANIZATIONS: "ORGANIZATIONS",
  ENTERPRISE: "ENTERPRISE",
  PLATFORM_STARTER: "PLATFORM_STARTER",
  PLATFORM_ESSENTIALS: "PLATFORM_ESSENTIALS",
  PLATFORM_SCALE: "PLATFORM_SCALE",
  PLATFORM_ENTERPRISE: "PLATFORM_ENTERPRISE",
  UNKNOWN: "Unknown",
} as const;

export type BillingPlan = (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS];

export const PLATFORM_PLANS_MAP: Record<string, BillingPlan> = {
  FREE: BILLING_PLANS.PLATFORM_STARTER,
  STARTER: BILLING_PLANS.PLATFORM_STARTER,
  ESSENTIALS: BILLING_PLANS.PLATFORM_ESSENTIALS,
  SCALE: BILLING_PLANS.PLATFORM_SCALE,
  ENTERPRISE: BILLING_PLANS.PLATFORM_ENTERPRISE,
};

export const PLATFORM_ENTERPRISE_SLUGS = process.env.PLATFORM_ENTERPRISE_SLUGS?.split(",") ?? [];
export const ENTERPRISE_SLUGS = process.env.ENTERPRISE_SLUGS?.split(",") ?? [];
