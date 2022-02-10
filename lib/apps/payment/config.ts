import { App } from "../interfaces/App";

export const APPS = {
  stripe_payment: {
    installed: !!(
      process.env.STRIPE_CLIENT_ID &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
      process.env.STRIPE_PRIVATE_KEY
    ),
    type: "stripe_payment",
    title: "Stripe",
    name: "Stripe",
    imageSrc: "apps/stripe.svg",
    description: "Collect payments",
    variant: "payment",
  },
} as Record<string, App>;
