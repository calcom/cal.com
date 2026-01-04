import Stripe from "stripe";

declare global {
  var stripe: Stripe | undefined;
}

export default function getStripe(key?: string) {
  if (globalThis.stripe) return globalThis.stripe;

  const stripeKey = key || process.env.STRIPE_PRIVATE_KEY;

  if (!stripeKey) {
    throw new Error("STRIPE_PRIVATE_KEY is missing");
  }

  globalThis.stripe = new Stripe(stripeKey, {
    apiVersion: "2020-08-27",
  });

  return globalThis.stripe;
}