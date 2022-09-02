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
  console.log("PLAN MODE", IS_PREMIUM_NEW_PLAN ? "payment" : "subscription");
  return IS_PREMIUM_NEW_PLAN ? "payment" : "subscription";
}

export function getPerSeatProPlanPrice(): string {
  return PRO_PLAN_PRICE;
}

export function getPremiumPlanPrice(): string {
  console.log(
    "PREMIUM PLAN PRICE",
    IS_PREMIUM_NEW_PLAN,
    IS_PREMIUM_NEW_PLAN ? PREMIUM_NEW_PLAN_PRICE : PREMIUM_PLAN_PRICE
  );
  return IS_PREMIUM_NEW_PLAN ? PREMIUM_NEW_PLAN_PRICE : PREMIUM_PLAN_PRICE;
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
