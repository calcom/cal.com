// @NOTE: should we remove this? It's just a wrapper of env vars
import {
  PREMIUM_MONTHLY_PLAN_PRICE,
  PREMIUM_PLAN_PRODUCT_ID,
  STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID,
  STRIPE_TEAM_MONTHLY_PRICE_ID,
} from "./constants";

export const getPremiumMonthlyPlanPriceId = (): string => {
  return PREMIUM_MONTHLY_PLAN_PRICE;
};

export function getPremiumPlanProductId(): string {
  return PREMIUM_PLAN_PRODUCT_ID;
}

export function getPerSeatPlanPrice(): string {
  return STRIPE_TEAM_MONTHLY_PRICE_ID;
}

export function getPhoneNumberMonthlyPriceId(): string {
  if (!STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID) {
    throw new Error("STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID env var is not set");
  }
  return STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID;
}

export function getPremiumPlanPriceValue() {
  return "$29/month";
}
