import type { Stripe } from "@stripe/stripe-js";
export type Maybe<T> = T | undefined | null;
/**
 * This is a singleton to ensure we only instantiate Stripe once.
 */
declare const getStripe: (userPublicKey?: string) => Promise<Stripe | null>;
export default getStripe;
//# sourceMappingURL=getStripe.d.ts.map