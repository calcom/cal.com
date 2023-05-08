import { z } from "zod";

export const ZStripeCheckoutSessionInputSchema = z
  .object({
    stripeCustomerId: z.string().optional(),
    checkoutSessionId: z.string().optional(),
  })
  .superRefine((arg, ctx) => {
    if (!arg.checkoutSessionId && !arg.stripeCustomerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Missing checkoutSessionId or stripeCustomerId",
      });
    }
    if (arg.checkoutSessionId && arg.stripeCustomerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both checkoutSessionId and stripeCustomerId provided",
      });
    }
  });

export type TStripeCheckoutSessionInputSchema = z.infer<typeof ZStripeCheckoutSessionInputSchema>;
