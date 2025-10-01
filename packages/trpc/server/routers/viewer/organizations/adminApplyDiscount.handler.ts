import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminApplyDiscount } from "./adminUpdateBilling.schema";

type AdminApplyDiscountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminApplyDiscount;
};

export const adminApplyDiscountHandler = async ({ input }: AdminApplyDiscountOptions) => {
  const org = await OrganizationRepository.adminFindById({ id: input.id });
  const parsedMetadata = teamMetadataSchema.parse(org.metadata);

  const stripeSubscriptionId = parsedMetadata?.subscriptionId;

  if (!stripeSubscriptionId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization does not have an active subscription",
    });
  }

  const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
    apiVersion: "2020-08-27",
  });

  try {
    // Apply the coupon/discount to the subscription
    await stripe.subscriptions.update(stripeSubscriptionId, {
      coupon: input.couponCode,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to apply discount",
    });
  }
};

export default adminApplyDiscountHandler;
