import stripe from "@calcom/app-store/stripepayment/lib/server";
import { prisma } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type StripeCustomerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const stripeCustomerHandler = async ({ ctx }: StripeCustomerOptions) => {
  const {
    user: { id: userId },
  } = ctx;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      metadata: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found" });
  }

  const metadata = userMetadata.parse(user.metadata);

  if (!metadata?.stripeCustomerId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No stripe customer id" });
  }
  // Fetch stripe customer
  const stripeCustomerId = metadata?.stripeCustomerId;
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  if (customer.deleted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No stripe customer found" });
  }

  const username = customer?.metadata?.username || null;

  return {
    isPremium: !!metadata?.isPremium,
    username,
  };
};
