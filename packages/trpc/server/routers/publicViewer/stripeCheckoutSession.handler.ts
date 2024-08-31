import { StripeRepository } from "@calcom/lib/server/repository/stripe";

import type { TStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";

type StripeCheckoutSessionOptions = {
  input: TStripeCheckoutSessionInputSchema;
};

export const stripeCheckoutSessionHandler = async ({ input }: StripeCheckoutSessionOptions) => {
  return await StripeRepository.getCheckoutSession(input);
};

export default stripeCheckoutSessionHandler;
