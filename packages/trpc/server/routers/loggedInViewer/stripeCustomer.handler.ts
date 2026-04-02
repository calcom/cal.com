import { getBillingProviderService } from "@calcom/ee/billing/di/containers/Billing";
import { prisma } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
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

  const billingService = getBillingProviderService();

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
      metadata: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found" });
  }

  const metadata = userMetadata.parse(user.metadata);
  let stripeCustomerId = metadata?.stripeCustomerId;
  if (!stripeCustomerId) {
    // Create stripe customer
    const customer = await billingService.createCustomer({
      email: user.email,
      metadata: {
        userId: userId.toString(),
      },
    });
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        metadata: {
          ...metadata,
          stripeCustomerId: customer.stripeCustomerId,
        },
      },
    });
    stripeCustomerId = customer.stripeCustomerId;
  }

  // Fetch stripe customer
  const customer = await billingService.getCustomer(stripeCustomerId);
  if (customer.deleted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No stripe customer found" });
  }

  const username = customer?.metadata?.username || null;

  return {
    isPremium: !!metadata?.isPremium,
    username,
  };
};
