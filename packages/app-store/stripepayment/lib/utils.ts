// @NOTE: should we remove this? It's just a wrapper of env vars
import {
  PREMIUM_PLAN_PRODUCT_ID,
  STRIPE_TEAM_MONTHLY_PRICE_ID,
  PREMIUM_MONTHLY_PLAN_PRICE,
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

export function getPremiumPlanPriceValue() {
  return "$29/mo";
}
