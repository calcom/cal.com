/**
 * Stripe checkout session metadata types
 * Used to identify the type of subscription/purchase in webhook handlers
 */
export const CHECKOUT_SESSION_TYPES = {
  PHONE_NUMBER_SUBSCRIPTION: "phone_number_subscription",
} as const;

export type CheckoutSessionType = (typeof CHECKOUT_SESSION_TYPES)[keyof typeof CHECKOUT_SESSION_TYPES];

export const BillingPlan = {
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

export type BillingPlan = (typeof BillingPlan)[keyof typeof BillingPlan];

export const PLATFORM_PLANS_MAP: Record<string, BillingPlan> = {
  FREE: BillingPlan.PLATFORM_STARTER,
  STARTER: BillingPlan.PLATFORM_STARTER,
  ESSENTIALS: BillingPlan.PLATFORM_ESSENTIALS,
  SCALE: BillingPlan.PLATFORM_SCALE,
  ENTERPRISE: BillingPlan.PLATFORM_ENTERPRISE,
};

export const PLATFORM_ENTERPRISE_SLUGS = process.env.PLATFORM_ENTERPRISE_SLUGS?.split(",") ?? [];
export const ENTERPRISE_SLUGS = process.env.ENTERPRISE_SLUGS?.split(",") ?? [];
