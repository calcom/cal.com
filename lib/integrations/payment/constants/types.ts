import Stripe from "stripe";

import StripePaymentService from "@lib/integrations/payment/services/StripePaymentService";

export type PaymentInfo = {
  link?: string | null;
  reason?: string | null;
  id?: string | null;
};

export type PaymentData = Stripe.Response<Stripe.PaymentIntent> & {
  stripe_publishable_key: string;
  stripeAccount: string;
};

export type PaymentMethodServiceType = typeof StripePaymentService;

export type StripeData = Stripe.OAuthToken & {
  default_currency: string;
};
