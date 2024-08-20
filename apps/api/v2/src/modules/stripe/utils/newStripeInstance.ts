import Stripe from "stripe";

const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY || "";
export const stripe = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});
