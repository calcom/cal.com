import process from "node:process";
import { getStripeCustomerIdFromUserId } from "@calcom/app-store/stripepayment/lib/customer";
import { getDubCustomer } from "@calcom/features/auth/lib/dub";
import { CHECKOUT_SESSION_TYPES } from "@calcom/features/ee/billing/constants";
import { getCheckoutSessionExpiresAt } from "@calcom/features/ee/billing/helpers/getCheckoutSessionExpiresAt";
import stripe from "@calcom/features/ee/payments/server/stripe";
import {
  IS_PRODUCTION,
  ORG_TRIAL_DAYS,
  ORGANIZATION_SELF_SERVE_PRICE,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { TrackingData } from "@calcom/lib/tracking";
import prisma from "@calcom/prisma";
import { BillingPeriod, teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type Stripe from "stripe";

const log = logger.getSubLogger({ prefix: ["teams/lib/payments"] });

export function getOrgPriceId(billingPeriod: "MONTHLY" | "ANNUALLY"): string {
  const priceId =
    billingPeriod === "ANNUALLY"
      ? process.env.STRIPE_ORG_ANNUAL_PRICE_ID
      : process.env.STRIPE_ORG_MONTHLY_PRICE_ID;

  if (!priceId) {
    const envVar =
      billingPeriod === "ANNUALLY" ? "STRIPE_ORG_ANNUAL_PRICE_ID" : "STRIPE_ORG_MONTHLY_PRICE_ID";
    throw new Error(`${envVar} is not set`);
  }

  return priceId;
}

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

function getTeamPriceId(billingPeriod: BillingPeriod): string {
  const priceId =
    billingPeriod === "ANNUALLY"
      ? process.env.STRIPE_TEAM_ANNUAL_PRICE_ID
      : process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error(
      `Missing env var: ${billingPeriod === "ANNUALLY" ? "STRIPE_TEAM_ANNUAL_PRICE_ID" : "STRIPE_TEAM_MONTHLY_PRICE_ID"}`
    );
  }

  return priceId;
}

/**
 * Used to generate a checkout session when trying to create a team
 */
export const generateTeamCheckoutSession = async ({
  teamName,
  teamSlug,
  userId,
  isOnboarding,
  billingPeriod = BillingPeriod.MONTHLY,
  tracking,
  promoCode,
}: {
  teamName: string;
  teamSlug: string;
  userId: number;
  isOnboarding?: boolean;
  billingPeriod?: BillingPeriod;
  tracking?: TrackingData;
  promoCode?: string;
}) => {
  const [customer, dubCustomer] = await Promise.all([
    getStripeCustomerIdFromUserId(userId),
    getDubCustomer(userId.toString()),
  ]);
  const priceId = getTeamPriceId(billingPeriod);
  const session = await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    expires_at: getCheckoutSessionExpiresAt(),
    ...(promoCode
      ? { discounts: [{ promotion_code: promoCode }] }
      : dubCustomer?.discount?.couponId
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
        price: priceId,
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
      billingPeriod,
      dubCustomerId: userId, // pass the userId during checkout creation for sales conversion tracking: https://d.to/conversions/stripe
      ...(isOnboarding !== undefined && { isOnboarding: isOnboarding.toString() }),
      ...tracking,
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
  /** When provided, takes priority over pricePerSeat and skips the dollars-to-cents conversion. */
  pricePerSeatInCents?: number | null;
  billingPeriod?: BillingPeriod;
  tracking?: TrackingData;
  promoCode?: string;
}) => {
  const {
    teamId,
    seatsToChargeFor,
    seatsUsed,
    userId,
    isOrg,
    pricePerSeat,
    pricePerSeatInCents,
    billingPeriod = BillingPeriod.MONTHLY,
    tracking,
    promoCode,
  } = input;
  const { url } = await checkIfTeamPaymentRequired({ teamId });
  if (url) return { url };

  // Use seatsUsed directly without enforcing minimum
  const seats = seatsUsed;
  const quantity = seatsToChargeFor ? seatsToChargeFor : seats;

  const customer = await getStripeCustomerIdFromUserId(userId);

  const fixedPrice = await getFixedPrice();

  let priceId: string | undefined;

  const hasCustomPrice = pricePerSeatInCents || pricePerSeat;
  if (hasCustomPrice) {
    const isSelfServePrice =
      (pricePerSeat && pricePerSeat === ORGANIZATION_SELF_SERVE_PRICE) ||
      (pricePerSeatInCents && pricePerSeatInCents === ORGANIZATION_SELF_SERVE_PRICE * 100);
    if (isOrg && isSelfServePrice) {
      priceId = fixedPrice as string;
    } else {
      const customPriceObj = await getPriceObject(fixedPrice);
      priceId = await createPrice({
        isOrg: !!isOrg,
        teamId,
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
    expires_at: getCheckoutSessionExpiresAt(),
    ...(promoCode ? { discounts: [{ promotion_code: promoCode }] } : { allow_promotion_codes: true }),
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
      ...tracking,
    },
    subscription_data: {
      metadata: {
        teamId,
        dubCustomerId: userId,
      },
      ...(isOrg && ORG_TRIAL_DAYS && { trial_period_days: ORG_TRIAL_DAYS }),
    },
  });
  return { url: session.url };

  async function createPrice({
    isOrg,
    teamId,
    billingPeriod,
    product,
    currency,
  }: {
    isOrg: boolean;
    teamId: number;
    billingPeriod: BillingPeriod;
    product: Stripe.Product | string;
    currency: string;
  }) {
    try {
      const resolvedCents = pricePerSeatInCents ?? (pricePerSeat ?? 0) * 100;
      // Price comes in monthly so we need to convert it to a monthly/yearly price
      const occurrence = billingPeriod === "MONTHLY" ? 1 : 12;
      const yearlyPrice = resolvedCents * occurrence;

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
    if (isOrg) {
      const fixedPriceId = getOrgPriceId(billingPeriod);
      log.debug(
        "Getting price ID",
        safeStringify({ fixedPriceId, isOrg, teamId, pricePerSeat, billingPeriod })
      );
      return fixedPriceId;
    }

    const fixedPriceId = getTeamPriceId(billingPeriod);
    log.debug(
      "Getting price ID",
      safeStringify({ fixedPriceId, isOrg, teamId, pricePerSeat, billingPeriod })
    );

    return fixedPriceId;
  }
};

async function getPriceObject(priceId: string) {
  const priceObj = await stripe.prices.retrieve(priceId);
  if (!priceObj) throw new Error(`No price found for ID ${priceId}`);

  return priceObj;
}
