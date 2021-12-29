import Stripe from "stripe";

const { STRIPE_PRIVATE_KEY } = process.env;

export const stripePrivateKey = STRIPE_PRIVATE_KEY!;

export const STRIPE = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});
