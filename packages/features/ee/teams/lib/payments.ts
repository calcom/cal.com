import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import stripe from "@calcom/app-store/stripepayment/lib/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const purchaseTeamSubscription = async (input: { teamId: number; seats: number; userId: number }) => {
  const { teamId, seats, userId } = input;
  const customer = await getStripeCustomerIdFromUserId(userId);
  return await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    success_url: `${WEBAPP_URL}/api/teams/${teamId}/upgrade?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBAPP_URL}/settings/profile`,
    locale: "en",
    line_items: [
      {
        /** We only need to set the base price and we can upsell it directly on Stripe's checkout  */
        price: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
        quantity: seats,
      },
    ],
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

export const cancelTeamSubscriptionFromStripe = async (teamId: number) => {
  try {
    const team = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: { metadata: true },
    });
    const metadata = teamMetadataSchema.parse(team.metadata);
    if (!metadata?.subscriptionId)
      throw Error(
        `Couldn't cancelTeamSubscriptionFromStripe, Team id: ${teamId} didn't have a subscriptionId`
      );
    return await stripe.subscriptions.cancel(metadata.subscriptionId);
  } catch (error) {
    let message = "Unknown error on cancelTeamSubscriptionFromStripe";
    if (error instanceof Error) message = error.message;
    console.error(message);
  }
};
