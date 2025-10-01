import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminCancelSubscription } from "./adminUpdateBilling.schema";

type AdminCancelSubscriptionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminCancelSubscription;
};

export const adminCancelSubscriptionHandler = async ({ input }: AdminCancelSubscriptionOptions) => {
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
    if (input.cancelAtPeriodEnd) {
      // Cancel at the end of the current billing period
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      // Cancel immediately
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    }

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
      message: "Failed to cancel subscription",
    });
  }
};

export default adminCancelSubscriptionHandler;
