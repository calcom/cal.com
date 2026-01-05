import { stripe } from "@calcom/app-store/_utils/stripe";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../../types";
import type { TGetSubscriptionSchema } from "./getSubscription.schema";

type GetSubscriptionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetSubscriptionSchema;
};

export const getSubscriptionHandler = async ({ input }: GetSubscriptionOptions) => {
  const { teamId } = input;

  // Get team to find billing info
  const [teamBilling, orgBilling, team] = await Promise.all([
    prisma.teamBilling.findUnique({
      where: { teamId },
    }),
    prisma.organizationBilling.findUnique({
      where: { teamId },
    }),
    prisma.team.findUnique({
      where: { id: teamId },
      select: { isOrganization: true },
    }),
  ]);

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const billing = team.isOrganization ? orgBilling : teamBilling;

  if (!billing?.subscriptionId) {
    return {
      subscription: null,
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
        trialStart: subscription.trial_start,
        trialEnd: subscription.trial_end,
        customerId: subscription.customer as string,
        items: subscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
          productId: item.price.product as string,
          quantity: item.quantity,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching subscription from Stripe:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch subscription from Stripe",
    });
  }
};

export default getSubscriptionHandler;
