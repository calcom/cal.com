import Stripe from "stripe";

const stripeApiKey = process.env.STRIPE_API_KEY || "";
export const stripeInstance = new Stripe(stripeApiKey, {
  apiVersion: "2020-08-27",
});
