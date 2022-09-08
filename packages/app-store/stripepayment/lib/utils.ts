import {
  FREE_PLAN_PRICE,
  FREE_PLAN_PRODUCT_ID,
  PREMIUM_PLAN_PRICE,
  PREMIUM_PLAN_PRODUCT_ID,
  PRO_PLAN_PRICE,
  PREMIUM_NEW_PLAN_PRICE,
  IS_PREMIUM_NEW_PLAN,
  PRO_PLAN_PRODUCT_ID,
} from "./constants";

export function getPremiumPlanMode() {
  return IS_PREMIUM_NEW_PLAN ? "payment" : "subscription";
}

export function getPremiumPlanPriceValue() {
  return IS_PREMIUM_NEW_PLAN ? "$499" : "$29/mo";
}

export function getPremiumPlanPrice(): string {
  return IS_PREMIUM_NEW_PLAN ? PREMIUM_NEW_PLAN_PRICE : PREMIUM_PLAN_PRICE;
}

export function getPerSeatProPlanPrice(): string {
  return PRO_PLAN_PRICE;
}

export function getProPlanPrice(): string {
  return PRO_PLAN_PRICE;
}

export function getFreePlanPrice(): string {
  return FREE_PLAN_PRICE;
}

export function getProPlanProductId(): string {
  return PRO_PLAN_PRODUCT_ID;
}

export function getPremiumPlanProductId(): string {
  return PREMIUM_PLAN_PRODUCT_ID;
}

export function getFreePlanProductId(): string {
  return FREE_PLAN_PRODUCT_ID;
}
