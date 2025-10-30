import { StripeService } from "@calcom/features/ee/payments/server/stripe-service";

import { ZStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";
import type { TStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";

type StripeCheckoutSessionOptions = {
  input: TStripeCheckoutSessionInputSchema;
};

export const stripeCheckoutSessionHandler = async ({ input }: StripeCheckoutSessionOptions) => {
  const parsedInput = ZStripeCheckoutSessionInputSchema.parse(input);

  return await StripeService.getCheckoutSession(parsedInput);
};

export default stripeCheckoutSessionHandler;
