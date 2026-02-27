import process from "node:process";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Stripe",
  description:
    "A Saas company a payment processing software, and application programming interfaces for e-commerce websites and mobile applications.",
  installed: !!(
    process.env.STRIPE_CLIENT_ID &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
    process.env.STRIPE_PRIVATE_KEY
  ),
  slug: "stripe",
  category: "payment",
  categories: ["payment"],
  logo: "icon.svg",
  publisher: "Cal.com",
  title: "Stripe",
  type: "stripe_payment",
  url: "https://cal.com/",
  docsUrl: "https://stripe.com/docs",
  variant: "payment",
  extendsFeature: "EventType",
  email: "help@cal.com",
  dirName: "stripepayment",
  isOAuth: true,
} as AppMeta;

export default metadata;
