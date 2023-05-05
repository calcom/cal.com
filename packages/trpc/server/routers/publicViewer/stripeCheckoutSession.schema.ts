import { z } from "zod";

export const ZStripeCheckoutSessionInputSchema = z.object({
  stripeCustomerId: z.string().optional(),
  checkoutSessionId: z.string().optional(),
});

export type TStripeCheckoutSessionInputSchema = z.infer<typeof ZStripeCheckoutSessionInputSchema>;
