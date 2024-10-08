import { StripeService } from "@calcom/lib/server/service/stripe";

import type { TStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";

type StripeCheckoutSessionOptions = {
  input: TStripeCheckoutSessionInputSchema;
};

export const stripeCheckoutSessionHandler = async ({ input }: StripeCheckoutSessionOptions) => {
  return await StripeService.getCheckoutSession(input);
};

export default stripeCheckoutSessionHandler;
