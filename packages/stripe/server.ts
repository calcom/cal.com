import Stripe from "stripe";

export type PaymentData = Stripe.Response<Stripe.PaymentIntent> & {
  stripe_publishable_key: string;
  stripeAccount: string;
};

export type StripeData = Stripe.OAuthToken & {
  default_currency: string;
};

const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY!;

const stripe = new Stripe(stripePrivateKey, {
  apiVersion: "2020-08-27",
});

export default stripe;
