import { z } from "zod";

import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getDubCustomer } from "@calcom/features/auth/lib/dub";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { CHECKOUT_SESSION_TYPES } from "@calcom/features/ee/billing/constants";
import { IS_PRODUCTION, WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrackingData } from "@calcom/lib/tracking";

const teamPaymentMetadataSchema = z.object({
  // Redefine paymentId, subscriptionId and subscriptionItemId to ensure that they are present and nonNullable
  paymentId: z.string(),
  subscriptionId: z.string(),
  subscriptionItemId: z.string(),
  orgSeats: teamMetadataSchema.unwrap().shape.orgSeats,
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
  isOnboarding,
  tracking,
}: {
  teamName: string;
  teamSlug: string;
  userId: number;
  isOnboarding?: boolean;
  tracking?: TrackingData;
}) => {
  const [customer, dubCustomer] = await Promise.all([
    getStripeCustomerIdFromUserId(userId),
    getDubCustomer(userId.toString()),
  ]);
  const session = await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    ...(dubCustomer?.discount?.couponId
      ? {
        discounts: [
          {
            coupon:
              process.env.NODE_ENV !== "production" && dubCustomer.discount.couponTestId
                ? dubCustomer.discount.couponTestId
                : dubCustomer.discount.couponId,
          },
        ],
      }
      : { allow_promotion_codes: true }),
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
    subscription_data: {
      trial_period_days: 14, // Add a 14-day trial
      metadata: {
        ...(isOnboarding && { source: "onboarding" }),
      },
    },
    metadata: {
      type: CHECKOUT_SESSION_TYPES.TEAM_CREATION,
      teamName,
      teamSlug,
      userId,
      dubCustomerId: userId, // pass the userId during checkout creation for sales conversion tracking: https://d.to/conversions/stripe
      ...(isOnboarding !== undefined && { isOnboarding: isOnboarding.toString() }),
      ...(tracking?.googleAds?.gclid && { gclid: tracking.googleAds.gclid, campaignId: tracking.googleAds?.campaignId }),
      ...(tracking?.linkedInAds?.liFatId && { liFatId: tracking.linkedInAds.liFatId, linkedInCampaignId: tracking.linkedInAds?.campaignId }),
    },
  });
  return session;
};

export const getTeamWithPaymentMetadata = async (teamId: number) => {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    select: { metadata: true, members: true, isOrganization: true },
  });

  const metadata = teamPaymentMetadataSchema.parse(team.metadata);
  return { ...team, metadata };
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
