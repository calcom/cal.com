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

  return {
    isPremium: !!metadata?.isPremium,
    username: null,
  };
};
