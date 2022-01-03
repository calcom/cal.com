import { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { stringify } from "querystring";

import { Maybe } from "@trpc/server";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!;
let stripePromise: Promise<Stripe | null>;

/**
 * This is a singleton to ensure we only instantiate Stripe once.
 */
const getStripe = (userPublicKey?: string) => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      userPublicKey || stripePublicKey /* , {
      locale: "es-419" TODO: Handle multiple locales,
    } */
    );
  }
  return stripePromise;
};

export function createPaymentLink(opts: {
  paymentUid: string;
  name?: Maybe<string>;
  date?: Maybe<string>;
  absolute?: boolean;
}): string {
  const { paymentUid, name, date, absolute = true } = opts;
  let link = "";
  if (absolute) link = process.env.NEXT_PUBLIC_APP_URL!;
  const query = stringify({ date, name });
  return link + `/payment/${paymentUid}?${query}`;
}

export default getStripe;
