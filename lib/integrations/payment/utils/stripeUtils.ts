import { loadStripe, Stripe } from "@stripe/stripe-js";
import { stringify } from "querystring";

import { PaymentLinkDetail } from "@lib/integrations/payment/interfaces/PaymentMethod";

const { NEXT_PUBLIC_STRIPE_PUBLIC_KEY } = process.env;

const stripePublicKey = NEXT_PUBLIC_STRIPE_PUBLIC_KEY!;
let stripePromise: Promise<Stripe | null>;

export const getStripe = (userPublicKey?: string) => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      userPublicKey || stripePublicKey /* , {
        locale: "es-419" TODO: Handle multiple locales,
      } */
    );
  }
  return stripePromise;
};

export const createPaymentLink = (opts: PaymentLinkDetail): string => {
  const { paymentUid, name, date, absolute = true } = opts;
  let link = "";
  if (absolute) link = process.env.NEXT_PUBLIC_APP_URL!;
  const query = stringify({ date, name });
  return link + `/payment/${paymentUid}?${query}`;
};
