import stripe from "@calcom/app-store/stripepayment/lib/server";

import type { TStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";

type StripeCheckoutSessionOptions = {
  input: TStripeCheckoutSessionInputSchema;
};

export const stripeCheckoutSessionHandler = async ({ input }: StripeCheckoutSessionOptions) => {
  const { checkoutSessionId, stripeCustomerId } = input;

  // TODO: Move the following data checks to superRefine
  if (!checkoutSessionId && !stripeCustomerId) {
    throw new Error("Missing checkoutSessionId or stripeCustomerId");
  }

  if (checkoutSessionId && stripeCustomerId) {
    throw new Error("Both checkoutSessionId and stripeCustomerId provided");
  }
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
};
