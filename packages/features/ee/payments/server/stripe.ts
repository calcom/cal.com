import Stripe from "stripe";

const globalForStripe = global as unknown as {
  stripe: Stripe | undefined;
};

const config: Stripe.StripeConfig = {
  apiVersion: "2020-08-27",
};

if (process.env.STRIPE_MOCK_HOST) {
  process.env.STRIPE_PRIVATE_KEY = "sk_test_123";
  config.host = process.env.STRIPE_MOCK_HOST;
  config.port = process.env.STRIPE_MOCK_PORT;
  config.protocol = "http";
}

const stripe = globalForStripe.stripe || new Stripe(process.env.STRIPE_PRIVATE_KEY!, config);

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe;
}

export default stripe;
