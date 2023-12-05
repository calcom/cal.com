import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

import { AppConfig } from "@calcom/web/app-config";

export type Maybe<T> = T | undefined | null;

const stripePublicKey = AppConfig.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || "";
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

export default getStripe;
