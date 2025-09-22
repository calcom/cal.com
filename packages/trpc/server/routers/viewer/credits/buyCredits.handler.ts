import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import prisma from "@calcom/prisma";
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

  if (teamId) {
    const adminMembership = await MembershipRepository.getAdminOrOwnerMembership(ctx.user.id, teamId);

    if (!adminMembership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  } else {
    // if user id is part of a team, user can't buy credits for themselves
    const memberships = await MembershipRepository.findAllAcceptedPublishedTeamMemberships(ctx.user.id);

    if (memberships && memberships.length > 0) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
  }

  let redirectUrl = `${WEBAPP_URL}/settings/billing`;

  if (teamId) {
    // Check if the team is an organization
    const teamRepository = new TeamRepository(prisma);
    const team = await teamRepository.findById({ id: teamId });

    if (team?.isOrganization) {
      redirectUrl = `${WEBAPP_URL}/settings/organizations/billing`;
    } else {
      redirectUrl = `${WEBAPP_URL}/settings/teams/${teamId}/billing`;
    }
  }

  const billingService = new StripeBillingService();

  const { checkoutUrl } = await billingService.createOneTimeCheckout({
    priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID,
    quantity,
    successUrl: redirectUrl,
    cancelUrl: redirectUrl,
    metadata: {
      ...(teamId && { teamId: teamId.toString() }),
      userId: ctx.user.id.toString(),
    },
  });

  return { sessionUrl: checkoutUrl };
};
