import { getBillingProviderService } from "@calcom/features/ee/billing/di/containers/Billing";
import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { BillingMode } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TUpdateBillingForTeamSchema } from "./updateBillingForTeam.schema";

const log = logger.getSubLogger({ prefix: ["admin", "updateBillingForTeam"] });

type UpdateBillingForTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateBillingForTeamSchema;
};

const updateBillingForTeamHandler = async ({ input }: UpdateBillingForTeamOptions) => {
  const { teamId, billingMode, pricePerSeat, paidSeats } = input;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      isOrganization: true,
      teamBilling: {
        select: {
          id: true,
          subscriptionId: true,
          subscriptionItemId: true,
          customerId: true,
          pricePerSeat: true,
          paidSeats: true,
          billingMode: true,
          billingPeriod: true,
        },
      },
      organizationBilling: {
        select: {
          id: true,
          subscriptionId: true,
          subscriptionItemId: true,
          customerId: true,
          pricePerSeat: true,
          paidSeats: true,
          billingMode: true,
          billingPeriod: true,
        },
      },
    },
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;

  if (!billing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No billing record found for this team" });
  }

  const updateData: {
    billingMode?: BillingMode;
    pricePerSeat?: number;
    paidSeats?: number;
  } = {};

  if (billingMode !== undefined) {
    updateData.billingMode = billingMode;
  }

  if (pricePerSeat !== undefined) {
    updateData.pricePerSeat = pricePerSeat;
  }

  if (paidSeats !== undefined) {
    updateData.paidSeats = paidSeats;
  }

  // If price changed and there's an active subscription, update Stripe
  if (pricePerSeat !== undefined && pricePerSeat !== billing.pricePerSeat && billing.subscriptionId) {
    await updateStripeSubscriptionPrice({
      subscriptionId: billing.subscriptionId,
      subscriptionItemId: billing.subscriptionItemId,
      newPricePerSeat: pricePerSeat,
      billingPeriod: billing.billingPeriod,
      isOrganization: team.isOrganization,
      teamId,
      paidSeats: paidSeats ?? billing.paidSeats,
    });
  }

  // If paidSeats changed and price didn't change, update the subscription quantity in Stripe
  if (
    paidSeats !== undefined &&
    paidSeats !== billing.paidSeats &&
    billing.subscriptionId &&
    billing.subscriptionItemId &&
    (pricePerSeat === undefined || pricePerSeat === billing.pricePerSeat)
  ) {
    try {
      const billingService = getBillingProviderService();
      await billingService.handleSubscriptionUpdate({
        subscriptionId: billing.subscriptionId,
        subscriptionItemId: billing.subscriptionItemId,
        membershipCount: paidSeats,
        prorationBehavior: "none",
      });
      log.info(`Updated Stripe subscription quantity to ${paidSeats} for team ${teamId}`);
    } catch (error) {
      log.error(`Failed to update Stripe subscription quantity for team ${teamId}`, { error });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update subscription quantity in Stripe",
      });
    }
  }

  // Update the billing record in our database
  if (team.isOrganization) {
    await prisma.organizationBilling.update({
      where: { id: billing.id },
      data: updateData,
    });
  } else {
    await prisma.teamBilling.update({
      where: { id: billing.id },
      data: updateData,
    });
  }

  log.info(`Updated billing for team ${teamId}`, { updateData });

  return { success: true };
};

async function updateStripeSubscriptionPrice({
  subscriptionId,
  subscriptionItemId,
  newPricePerSeat,
  billingPeriod,
  isOrganization,
  teamId,
  paidSeats,
}: {
  subscriptionId: string;
  subscriptionItemId: string;
  newPricePerSeat: number;
  billingPeriod: string | null;
  isOrganization: boolean;
  teamId: number;
  paidSeats: number | null;
}) {
  try {
    // Get the current subscription to find the product
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data.find((item) => item.id === subscriptionItemId);

    if (!currentItem) {
      throw new Error(`Subscription item ${subscriptionItemId} not found in subscription ${subscriptionId}`);
    }

    const product = currentItem.price.product as string;
    const currency = currentItem.price.currency;

    // Determine interval based on billing period
    const interval: "month" | "year" = billingPeriod === "ANNUALLY" ? "year" : "month";
    const occurrence = billingPeriod === "ANNUALLY" ? 12 : 1;

    // Create a new price in Stripe
    const newPrice = await stripe.prices.create({
      nickname: `Admin-set price for ${isOrganization ? "Organization" : "Team"} ID: ${teamId}`,
      unit_amount: newPricePerSeat * 100 * occurrence,
      currency,
      recurring: { interval },
      product,
    });

    // Update the subscription with the new price
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPrice.id,
          ...(paidSeats ? { quantity: paidSeats } : {}),
        },
      ],
      proration_behavior: "none",
    });

    log.info(`Updated Stripe subscription price for team ${teamId}`, {
      subscriptionId,
      newPriceId: newPrice.id,
      newPricePerSeat,
    });
  } catch (error) {
    log.error(`Failed to update Stripe subscription price for team ${teamId}`, { error });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update subscription price in Stripe",
    });
  }
}

export default updateBillingForTeamHandler;
