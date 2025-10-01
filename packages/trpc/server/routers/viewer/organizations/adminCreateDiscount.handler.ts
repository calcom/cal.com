import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminCreateDiscount } from "./adminUpdateBilling.schema";

type AdminCreateDiscountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminCreateDiscount;
};

export const adminCreateDiscountHandler = async ({ input }: AdminCreateDiscountOptions) => {
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
    // Create coupon in Stripe
    const couponData: Stripe.CouponCreateParams = {
      name: input.name || `Discount for Org ${org.name}`,
      duration: input.duration,
    };

    // Set discount value based on type
    if (input.discountType === "percentage") {
      couponData.percent_off = input.discountValue;
    } else {
      couponData.amount_off = Math.round(input.discountValue * 100); // Convert to cents
      couponData.currency = "usd";
    }

    // Set duration in months if repeating
    if (input.duration === "repeating" && input.durationInMonths) {
      couponData.duration_in_months = input.durationInMonths;
    }

    const coupon = await stripe.coupons.create(couponData);

    // Apply the coupon to the subscription immediately
    await stripe.subscriptions.update(stripeSubscriptionId, {
      coupon: coupon.id,
    });

    return {
      success: true,
      couponId: coupon.id,
      couponName: coupon.name,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create discount",
    });
  }
};

export default adminCreateDiscountHandler;
