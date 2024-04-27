import { z } from "zod";

import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import stripe from "@calcom/app-store/stripepayment/lib/server";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { MINIMUM_NUMBER_OF_ORG_SEATS, WEBAPP_URL } from "@calcom/lib/constants";
import { ORGANIZATION_MIN_SEATS } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const log = logger.getSubLogger({ prefix: ["teams/lib/payments"] });
const teamPaymentMetadataSchema = z.object({
  paymentId: z.string(),
  subscriptionId: z.string(),
  subscriptionItemId: z.string(),
});

/** Used to prevent double charges for the same team */
export const checkIfTeamPaymentRequired = async ({ teamId = -1 }) => {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    select: { metadata: true },
  });
  const metadata = teamMetadataSchema.parse(team.metadata);
  /** If there's no paymentId, we need to pay this team */
  if (!metadata?.paymentId) return { url: null };
  const checkoutSession = await stripe.checkout.sessions.retrieve(metadata.paymentId);
  /** If there's a pending session but it isn't paid, we need to pay this team */
  if (checkoutSession.payment_status !== "paid") return { url: null };
  /** If the session is already paid we return the upgrade URL so team is updated. */
  return { url: `${WEBAPP_URL}/api/teams/${teamId}/upgrade?session_id=${metadata.paymentId}` };
};

/**
 * Used to generate a checkout session when trying to create a team
 */
export const generateTeamCheckoutSession = async ({
  teamName,
  teamSlug,
  userId,
}: {
  teamName: string;
  teamSlug: string;
  userId: number;
}) => {
  const customer = await getStripeCustomerIdFromUserId(userId);
  const session = await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: `${WEBAPP_URL}/api/teams/create?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBAPP_URL}/settings/my-account/profile`,
    line_items: [
      {
        /** We only need to set the base price and we can upsell it directly on Stripe's checkout  */
        price: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
        /**Initially it will be just the team owner */
        quantity: 1,
      },
    ],
    customer_update: {
      address: "auto",
    },
    // Disabled when testing locally as usually developer doesn't setup Tax in Stripe Test mode
    automatic_tax: {
      enabled: IS_PRODUCTION,
    },
    metadata: {
      teamName,
      teamSlug,
      userId,
    },
  });
  return session;
};

/**
 * Used to generate a checkout session when creating a new org (parent team) or backwards compatibility for old teams
 */
export const purchaseTeamOrOrgSubscription = async (input: {
  teamId: number;
  seats: number;
  userId: number;
  isOrg?: boolean;
  pricePerSeat: number | null;
}) => {
  const { teamId, seats, userId, isOrg, pricePerSeat } = input;
  const { url } = await checkIfTeamPaymentRequired({ teamId });
  if (url) return { url };

  // For orgs, enforce minimum of 30 seats
  const quantity = isOrg ? Math.max(seats, MINIMUM_NUMBER_OF_ORG_SEATS) : seats;
  const customer = await getStripeCustomerIdFromUserId(userId);

  const session = await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: `${WEBAPP_URL}/api/teams/${teamId}/upgrade?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBAPP_URL}/settings/my-account/profile`,
    line_items: [
      {
        price: await getPriceId(),
        quantity: quantity,
      },
    ],
    customer_update: {
      address: "auto",
    },
    // Disabled when testing locally as usually developer doesn't setup Tax in Stripe Test mode
    automatic_tax: {
      enabled: IS_PRODUCTION,
    },
    metadata: {
      teamId,
    },
    subscription_data: {
      metadata: {
        teamId,
      },
    },
  });
  return { url: session.url };

  /**
   * Determines the priceId depending on if a custom price is required or not.
   * If the organization has a custom price per seat, it will create a new price in stripe and return its ID.
   */
  async function getPriceId() {
    const fixedPriceId = isOrg
      ? process.env.STRIPE_ORG_MONTHLY_PRICE_ID
      : process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;

    if (!fixedPriceId) {
      throw new Error(
        "You need to have STRIPE_ORG_MONTHLY_PRICE_ID and STRIPE_TEAM_MONTHLY_PRICE_ID env variables set"
      );
    }

    log.debug("Getting price ID", safeStringify({ fixedPriceId, isOrg, teamId, pricePerSeat }));

    if (!pricePerSeat) {
      return fixedPriceId;
    }

    const priceObj = await stripe.prices.retrieve(fixedPriceId);
    if (!priceObj) throw new Error(`No price found for ID ${fixedPriceId}`);
    try {
      const customPriceObj = await stripe.prices.create({
        nickname: `Custom price for ${isOrg ? "Organization" : "Team"} ID: ${teamId}`,
        unit_amount: pricePerSeat * 100, // Stripe expects the amount in cents
        // Use the same currency as in the fixed price to avoid hardcoding it.
        currency: priceObj.currency,
        recurring: { interval: "month" }, // Define your subscription interval
        product: typeof priceObj.product === "string" ? priceObj.product : priceObj.product.id,
        tax_behavior: "exclusive",
      });
      return customPriceObj.id;
    } catch (e) {
      log.error(
        `Error creating custom price for ${isOrg ? "Organization" : "Team"} ID: ${teamId}`,
        safeStringify(e)
      );

      throw new Error("Error in creation of custom price");
    }
  }
};

const getTeamWithPaymentMetadata = async (teamId: number) => {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    select: { metadata: true, members: true, isOrganization: true },
  });

  const metadata = teamPaymentMetadataSchema.parse(team.metadata);
  return { ...team, metadata };
};

export const cancelTeamSubscriptionFromStripe = async (teamId: number) => {
  try {
    const team = await getTeamWithPaymentMetadata(teamId);
    const { subscriptionId } = team.metadata;
    return await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    let message = "Unknown error on cancelTeamSubscriptionFromStripe";
    if (error instanceof Error) message = error.message;
    console.error(message);
  }
};

export const updateQuantitySubscriptionFromStripe = async (teamId: number) => {
  try {
    const { url } = await checkIfTeamPaymentRequired({ teamId });
    /**
     * If there's no pending checkout URL it means that this team has not been paid.
     * We cannot update the subscription yet, this will be handled on publish/checkout.
     **/
    if (!url) return;
    const team = await getTeamWithPaymentMetadata(teamId);
    const { subscriptionId, subscriptionItemId } = team.metadata;
    const membershipCount = team.members.length;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionQuantity = subscription.items.data.find(
      (sub) => sub.id === subscriptionItemId
    )?.quantity;
    if (!subscriptionQuantity) throw new Error("Subscription not found");

    if (team.isOrganization && membershipCount < ORGANIZATION_MIN_SEATS) {
      console.info(
        `Org ${teamId} has less members than the min ${ORGANIZATION_MIN_SEATS}, skipping updating subscription.`
      );
      return;
    }

    await stripe.subscriptions.update(subscriptionId, {
      items: [{ quantity: membershipCount, id: subscriptionItemId }],
    });
    console.info(
      `Updated subscription ${subscriptionId} for team ${teamId} to ${team.members.length} seats.`
    );
  } catch (error) {
    let message = "Unknown error on updateQuantitySubscriptionFromStripe";
    if (error instanceof Error) message = error.message;
    console.error(message);
  }
};
