/**
 * Stripe checkout session metadata types
 * Used to identify the type of subscription/purchase in webhook handlers
 */
export const CHECKOUT_SESSION_TYPES = {
  PHONE_NUMBER_SUBSCRIPTION: "phone_number_subscription",
} as const;

export type CheckoutSessionType = (typeof CHECKOUT_SESSION_TYPES)[keyof typeof CHECKOUT_SESSION_TYPES];

export enum BillingPlans {
  INDIVIDUALS = "INDIVIDUALS",
  TEAMS = "TEAMS",
  ORGANIZATIONS = "ORGANIZATIONS",
  ENTERPRISE = "ENTERPRISE",
  PLATFORM_STARTER = "PLATFORM_STARTER",
  PLATFORM_ESSENTIALS = "PLATFORM_ESSENTIALS",
  PLATFORM_SCALE = "PLATFORM_SCALE",
  PLATFORM_ENTERPRISE = "PLATFORM_ENTERPRISE",
  UNKNOWN = "Unknown",
}
