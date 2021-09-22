import { loadStripe, Stripe } from "@stripe/stripe-js";
import { stringify } from "querystring";

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

export function createPaymentLink(paymentUid: string, name?: string, date?: string, absolute = true): string {
  let link = "";
  if (absolute) link = process.env.NEXT_PUBLIC_APP_URL!;
  const query = stringify({ date, name });
  return link + `/payment/${paymentUid}?${query}`;
}

export default getStripe;
