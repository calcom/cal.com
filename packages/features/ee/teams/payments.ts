import { Prisma } from "@prisma/client";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { CAL_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

export type BillingFrequency = "monthly" | "yearly";

export const purchaseTeamSubscription = async (
  teamId: number,
  billingFrequency: "monthly" | "yearly",
  seats: number,
  email: string
) => {
  return await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${CAL_URL}/settings/teams/${teamId}/profile`,
    cancel_url: `${CAL_URL}/settings/profile`,
    line_items: [
      {
        price:
          billingFrequency === "monthly"
            ? process.env.STRIPE_TEAM_MONTHLY_PRICE_ID
            : process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
        quantity: seats,
      },
    ],
    customer_email: email,
    metadata: {
      teamId,
    },
    payment_method_types: ["card"],
    subscription_data: {
      metadata: {
        teamId,
      },
    },
  });
};

export const getStripeIdsForTeam = async (teamId: number) => {
  const teamQuery = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: {
      metadata: true,
    },
  });

  if (teamQuery?.metadata) {
    const teamStripeIds = teamQuery.metadata as Prisma.JsonObject;
    return teamStripeIds;
  } else {
    throw new Error(`Team ${teamId} not found`);
  }
};

export const deleteTeamFromStripe = async (teamId: number) => {
  const teamQuery = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: { metadata: true },
  });

  if (!teamQuery?.metadata) throw new Error(`Team ${teamId} not found`);
  const teamStripeIds = teamQuery.metadata as Prisma.JsonObject;

  if (teamStripeIds.stripeCustomerId) {
    await stripe.customers.del(teamStripeIds.stripeCustomerId as string);
    return;
  } else {
    throw new Error("Team not found");
  }
};
