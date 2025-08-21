// @NOTE: should we remove this? It's just a wrapper of env vars
import {
  PREMIUM_PLAN_PRODUCT_ID,
  STRIPE_TEAM_MONTHLY_PRICE_ID,
  PREMIUM_MONTHLY_PLAN_PRICE,
  STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID,
} from "./constants";

export const getPremiumMonthlyPlanPriceId = (): string => {
  return PREMIUM_MONTHLY_PLAN_PRICE;
};

export function getPremiumPlanProductId(): string {
  return PREMIUM_PLAN_PRODUCT_ID;
}

/**
 * Returns the Stripe price ID for the per-seat (team monthly) plan.
 *
 * @returns The `STRIPE_TEAM_MONTHLY_PRICE_ID` used for team/per-seat monthly subscriptions.
 */
export function getPerSeatPlanPrice(): string {
  return STRIPE_TEAM_MONTHLY_PRICE_ID;
}

/**
 * Returns the Stripe price ID for the monthly phone-number add-on.
 *
 * Throws an Error if the STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID environment value is not configured.
 *
 * @returns The Stripe price ID string for the phone number monthly price.
 * @throws Error if STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID is falsy.
 */
export function getPhoneNumberMonthlyPriceId(): string {
  if (!STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID) {
    throw new Error("STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID env var is not set");
  }
  return STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID;
}

/**
 * Returns the display price for the premium monthly plan.
 *
 * @returns The premium plan price as a display string, `"$29/month"`.
 */
export function getPremiumPlanPriceValue() {
  return "$29/month";
}
