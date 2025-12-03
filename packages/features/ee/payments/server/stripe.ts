import Stripe from "stripe";

declare global {
   
  var stripe: Stripe | undefined;
}

const stripe =
  globalThis.stripe ||
  new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
    apiVersion: "2020-08-27",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.stripe = stripe;
}

export default stripe;
