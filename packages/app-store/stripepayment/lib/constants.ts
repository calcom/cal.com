export const FREE_PLAN_PRICE = process.env.NEXT_PUBLIC_STRIPE_FREE_PLAN_PRICE || "";
export const PREMIUM_PLAN_PRICE = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE || "";
export const IS_PREMIUM_NEW_PLAN = process.env.NEXT_PUBLIC_IS_PREMIUM_NEW_PLAN === "1" ? true : false;
export const PREMIUM_NEW_PLAN_PRICE = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_NEW_PLAN_PRICE || "";
export const PRO_PLAN_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE || "";
export const FREE_PLAN_PRODUCT_ID = process.env.STRIPE_FREE_PLAN_PRODUCT_ID || "";
export const PRO_PLAN_PRODUCT_ID = process.env.STRIPE_PRO_PLAN_PRODUCT_ID || "";
export const PREMIUM_PLAN_PRODUCT_ID = process.env.STRIPE_PREMIUM_PLAN_PRODUCT_ID || "";
