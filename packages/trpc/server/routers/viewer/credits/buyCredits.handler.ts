import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TBuyCreditsSchema } from "./buyCredits.schema";

type BuyCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBuyCreditsSchema;
};

export const buyCreditsHandler = async ({ ctx, input }: BuyCreditsOptions) => {
  if (!process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Credits are not enabled",
    });
  }

  const { quantity, teamId } = input;

  const adminMembership = await MembershipRepository.getAdminOrOwnerMembership(ctx.user.id, teamId);

  if (!adminMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const redirect_uri = `${WEBAPP_URL}/settings/teams/${teamId}/billing`;

  const billingService = new StripeBillingService();

  const { checkoutUrl } = await billingService.createOneTimeCheckout({
    priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID,
    quantity,
    successUrl: redirect_uri,
    cancelUrl: redirect_uri,
    metadata: { teamId: teamId.toString(), userId: ctx.user.id.toString() },
  });

  return { sessionUrl: checkoutUrl };
};
