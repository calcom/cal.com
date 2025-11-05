import type Stripe from "stripe";
import { z } from "zod";

import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getDubCustomer } from "@calcom/features/auth/lib/dub";
import stripe from "@calcom/features/ee/payments/server/stripe";
import {
  IS_PRODUCTION,
  MINIMUM_NUMBER_OF_ORG_SEATS,
  ORGANIZATION_SELF_SERVE_MIN_SEATS,
  ORGANIZATION_SELF_SERVE_PRICE,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { BillingPeriod } from "@calcom/prisma/zod-utils";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const log = logger.getSubLogger({ prefix: ["teams/lib/payments"] });
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
}: {
  teamName: string;
  teamSlug: string;
  userId: number;
  isOnboarding?: boolean;
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
    },
    metadata: {
      teamName,
      teamSlug,
      userId,
      dubCustomerId: userId, // pass the userId during checkout creation for sales conversion tracking: https://d.to/conversions/stripe
      ...(isOnboarding !== undefined && { isOnboarding: isOnboarding.toString() }),
    },
  });
  return session;
};

/**
 * @deprecated Move over to internal-team-billing
 * Used to generate a checkout session when creating a new org (parent team) or backwards compatibility for old teams
 */
export const purchaseTeamOrOrgSubscription = async (input: {
  teamId: number;
  /**
   * The actual number of seats in the team.
   * The seats that we would charge for could be more than this depending on the MINIMUM_NUMBER_OF_ORG_SEATS in case of an organization
   * For a team it would be the same as this value
   */
  seatsUsed: number;
  /**
   * If provided, this is the exact number we would charge for.
   */
  seatsToChargeFor?: number | null;
  userId: number;
  isOrg?: boolean;
  pricePerSeat: number | null;
  billingPeriod?: BillingPeriod;
}) => {
  const {
    teamId,
    seatsToChargeFor,
    seatsUsed,
    userId,
    isOrg,
    pricePerSeat,
    billingPeriod = BillingPeriod.MONTHLY,
  } = input;
  const { url } = await checkIfTeamPaymentRequired({ teamId });
  if (url) return { url };

  // For orgs, enforce minimum of MINIMUM_NUMBER_OF_ORG_SEATS seats if `seatsToChargeFor` not set
  const seats = isOrg ? Math.max(seatsUsed, MINIMUM_NUMBER_OF_ORG_SEATS) : seatsUsed;
  const quantity = seatsToChargeFor ? seatsToChargeFor : seats;

  const customer = await getStripeCustomerIdFromUserId(userId);

  const fixedPrice = await getFixedPrice();

  let priceId: string | undefined;

  if (pricePerSeat) {
    if (
      isOrg &&
      pricePerSeat === ORGANIZATION_SELF_SERVE_PRICE &&
      seats === ORGANIZATION_SELF_SERVE_MIN_SEATS
    ) {
      priceId = fixedPrice as string;
    } else {
      const customPriceObj = await getPriceObject(fixedPrice);
      priceId = await createPrice({
        isOrg: !!isOrg,
        teamId,
        pricePerSeat,
        billingPeriod,
        product: customPriceObj.product as string, // We don't expand the object from stripe so just use the product as ID
        currency: customPriceObj.currency,
      });
    }
  } else {
    priceId = fixedPrice as string;
  }

  const session = await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: `${WEBAPP_URL}/api/teams/${teamId}/upgrade?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${WEBAPP_URL}/settings/my-account/profile`,
    line_items: [
      {
        price: priceId,
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
        dubCustomerId: userId,
      },
    },
  });
  return { url: session.url };

  async function createPrice({
    isOrg,
    teamId,
    pricePerSeat,
    billingPeriod,
    product,
    currency,
  }: {
    isOrg: boolean;
    teamId: number;
    pricePerSeat: number;
    billingPeriod: BillingPeriod;
    product: Stripe.Product | string;
    currency: string;
  }) {
    try {
      const pricePerSeatInCents = pricePerSeat * 100;
      // Price comes in monthly so we need to convert it to a monthly/yearly price
      const occurrence = billingPeriod === "MONTHLY" ? 1 : 12;
      const yearlyPrice = pricePerSeatInCents * occurrence;

      const customPriceObj = await stripe.prices.create({
        nickname: `Custom price for ${isOrg ? "Organization" : "Team"} ID: ${teamId}`,
        unit_amount: yearlyPrice, // Stripe expects the amount in cents
        // Use the same currency as in the fixed price to avoid hardcoding it.
        currency: currency,
        recurring: { interval: billingPeriod === "MONTHLY" ? "month" : "year" }, // Define your subscription interval
        product: typeof product === "string" ? product : product.id,
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

  /**
   * Determines the priceId depending on if a custom price is required or not.
   * If the organization has a custom price per seat, it will create a new price in stripe and return its ID.
   */
  async function getFixedPrice() {
    const fixedPriceId = isOrg
      ? process.env.STRIPE_ORG_MONTHLY_PRICE_ID
      : process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;

    if (!fixedPriceId) {
      throw new Error(
        "You need to have STRIPE_ORG_MONTHLY_PRICE_ID and STRIPE_TEAM_MONTHLY_PRICE_ID env variables set"
      );
    }

    log.debug("Getting price ID", safeStringify({ fixedPriceId, isOrg, teamId, pricePerSeat }));

    return fixedPriceId;
  }
};

async function getPriceObject(priceId: string) {
  const priceObj = await stripe.prices.retrieve(priceId);
  if (!priceObj) throw new Error(`No price found for ID ${priceId}`);

  return priceObj;
}

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
    const { subscriptionId, subscriptionItemId, orgSeats } = team.metadata;
    // Either it would be custom pricing where minimum number of seats are changed(available in orgSeats) or it would be default MINIMUM_NUMBER_OF_ORG_SEATS
    // We can't go below this quantity for subscription
    const orgMinimumSubscriptionQuantity = orgSeats || MINIMUM_NUMBER_OF_ORG_SEATS;
    const membershipCount = team.members.length;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionQuantity = subscription.items.data.find(
      (sub) => sub.id === subscriptionItemId
    )?.quantity;
    if (!subscriptionQuantity) throw new Error("Subscription not found");

    if (team.isOrganization && membershipCount < orgMinimumSubscriptionQuantity) {
      console.info(
        `Org ${teamId} has less members than the min required ${orgMinimumSubscriptionQuantity}, skipping updating subscription.`
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
