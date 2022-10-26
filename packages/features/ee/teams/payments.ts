import stripe from "@calcom/app-store/stripepayment/lib/server";
import { CAL_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

export type BillingFrequency = "monthly" | "yearly";

export const purchaseTeamSubscription = async (input: { teamId: number; seats: number; email: string }) => {
  const { teamId, seats, email } = input;
  return await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${CAL_URL}/settings/teams/${teamId}/profile`,
    cancel_url: `${CAL_URL}/settings/profile`,
    locale: "en",
    line_items: [
      {
        /** We only need to set the base price and we can upsell it directly on Stripe's checkout  */
        price: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
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

  const teamStripeIds = { ...teamQuery.metadata };

  return teamStripeIds;
};

export const deleteTeamFromStripe = async (teamId: number) => {
  const stripeCustomerId = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: { metadata: true },
  });

  if (stripeCustomerId?.metadata?.stripeCustomerId) {
    await stripe.customers.del(stripeCustomerId.metadata.stripeCustomerId);
    return;
  } else {
    console.error(`Couldn't deleteTeamFromStripe, Team id: ${teamId} didn't have a stripeCustomerId`);
  }
};
