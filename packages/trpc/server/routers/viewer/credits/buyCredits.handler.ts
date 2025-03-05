import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TBuyCreditsSchema } from "./buyCredits.schema";

type BuyCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBuyCreditsSchema;
};

export const buyCreditsHandler = async ({ ctx, input }: BuyCreditsOptions) => {
  const { quantity } = input;

  const redirect_uri = `${WEBAPP_URL}/settings/billing`;

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: process.env.STRIPE_CREDITS_PRICE_ID, quantity }],
    mode: "payment",
    success_url: redirect_uri,
    cancel_url: redirect_uri,
  });

  return { sessionUrl: session.url };
};
