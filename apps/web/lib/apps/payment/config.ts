import type { App } from "@calcom/types/App";

/** @deprecated Migrate to App Store */
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
    email: "",
    url: "",
    label: "",
    slug: "",
    category: "",
    logo: "",
    publisher: "Cal.com",
    verified: true,
    trending: false,
    rating: 5,
    reviews: 100,
  },
} as Record<string, App>;
