import {
  FREE_PLAN_PRICE,
  FREE_PLAN_PRODUCT_ID,
  PREMIUM_PLAN_PRICE,
  PREMIUM_PLAN_PRODUCT_ID,
  PRO_PLAN_PRICE,
  PRO_PLAN_PRODUCT_ID,
} from "./constants";

export function getPerSeatProPlanPrice(): string {
  return PRO_PLAN_PRICE;
}

export function getPremiumPlanPrice(): string {
  return PREMIUM_PLAN_PRICE;
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
