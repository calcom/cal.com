import { TRPCError } from "@trpc/server";

import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminUpdateBilling } from "./adminUpdateBilling.schema";

type AdminUpdateBillingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdateBilling;
};

export const adminUpdateBillingHandler = async ({ input }: AdminUpdateBillingOptions) => {
  const org = await OrganizationRepository.adminFindById({ id: input.id });
  const parsedMetadata = teamMetadataSchema.parse(org.metadata);

  const stripeSubscriptionId = parsedMetadata?.subscriptionId;
  const stripeSubscriptionItemId = parsedMetadata?.subscriptionItemId;

  if (!stripeSubscriptionId || !stripeSubscriptionItemId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization does not have an active subscription",
    });
  }

  const billingService = new StripeBillingService();

  // Update subscription quantity (seats)
  if (input.seats !== undefined) {
    await billingService.handleSubscriptionUpdate({
      subscriptionId: stripeSubscriptionId,
      subscriptionItemId: stripeSubscriptionItemId,
      membershipCount: input.seats,
    });

    // Update metadata
    await OrganizationRepository.updateStripeSubscriptionDetails({
      id: input.id,
      stripeSubscriptionId,
      stripeSubscriptionItemId,
      existingMetadata: {
        ...parsedMetadata,
        orgSeats: input.seats,
      },
    });
  }

  // For price changes, we need to create a new price and update the subscription
  if (input.pricePerSeat !== undefined) {
    // Note: This requires creating a new price in Stripe
    // For now, we'll just update the metadata
    await OrganizationRepository.updateStripeSubscriptionDetails({
      id: input.id,
      stripeSubscriptionId,
      stripeSubscriptionItemId,
      existingMetadata: {
        ...parsedMetadata,
        orgPricePerSeat: input.pricePerSeat,
      },
    });
  }

  return { success: true };
};

export default adminUpdateBillingHandler;
