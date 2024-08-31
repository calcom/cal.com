import { z } from "zod";

import stripe from "@calcom/app-store/stripepayment/lib/server";

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

export class StripeRepository {
  static async getCheckoutSession(input: z.infer<typeof ZStripeCheckoutSessionInputSchema>) {
    const { checkoutSessionId, stripeCustomerId } = input;

    // Moved the following data checks to superRefine
    ZStripeCheckoutSessionInputSchema.parse(input);

    let customerId: string;
    let isPremiumUsername = false;
    let hasPaymentFailed = false;
    if (checkoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
        if (typeof session.customer !== "string") {
          return {
            valid: false,
          };
        }
        customerId = session.customer;
        isPremiumUsername = true;
        hasPaymentFailed = session.payment_status !== "paid";
      } catch (e) {
        return {
          valid: false,
        };
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      customerId = stripeCustomerId!;
    }

    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return {
          valid: false,
        };
      }

      return {
        valid: true,
        hasPaymentFailed,
        isPremiumUsername,
        customer: {
          username: customer.metadata.username,
          email: customer.metadata.email,
          stripeCustomerId: customerId,
        },
      };
    } catch (e) {
      return {
        valid: false,
      };
    }
  }
}
