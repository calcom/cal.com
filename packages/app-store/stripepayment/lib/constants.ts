import process from "node:process";
export const PREMIUM_MONTHLY_PLAN_PRICE = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE_MONTHLY || "";
export const PREMIUM_PLAN_PRODUCT_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRODUCT_ID || "";
export const STRIPE_TEAM_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || "";
export const STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID = process.env.STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID || "";

export const paymentOptions = [
  {
    label: "on_booking_option",
    value: "ON_BOOKING",
  },
  {
    label: "hold_option",
    value: "HOLD",
  },
];
