export const PREMIUM_MONTHLY_PLAN_PRICE = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRICE_MONTHLY || "";
export const PREMIUM_PLAN_PRODUCT_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_PRODUCT_ID || "";
export const STRIPE_TEAM_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || "";

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

export const DEFAULT_LOCALE = "en-US";
export const DEFAULT_COUNTRY = "US";
export const DEFAULT_SHOPPER_REFERENCE = "jonny-jansen";
export const DEFAULT_AMOUNT = "2000";
