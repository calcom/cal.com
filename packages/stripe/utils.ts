import { FREE_PLAN_PRICE, PREMIUM_PLAN_PRICE, PRO_PLAN_PRICE, PRO_PLAN_PRODUCT } from "./constants";

export function getPerSeatProPlanPrice(): string {
  return PRO_PLAN_PRICE;
}

export function getPremiumPlanPrice(): string {
  return PREMIUM_PLAN_PRICE;
}

export function getProPlanPrice(): string {
  return PRO_PLAN_PRICE;
}

export function getProPlanProduct(): string {
  return PRO_PLAN_PRODUCT;
}

export function getFreePlanPrice(): string {
  return FREE_PLAN_PRICE;
}
