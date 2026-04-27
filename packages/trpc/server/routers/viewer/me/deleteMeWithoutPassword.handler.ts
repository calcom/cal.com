import { deleteStripeCustomer } from "@calcom/app-store/stripepayment/lib/customer";
import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

const log = logger.getSubLogger({ prefix: ["deleteMeWithoutPassword"] });

type DeleteMeWithoutPasswordOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const deleteMeWithoutPasswordHandler = async ({ ctx }: DeleteMeWithoutPasswordOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      email: ctx.user.email.toLowerCase(),
    },
  });
  if (!user) {
    throw new Error(ErrorCode.UserNotFound);
  }

  if (user.identityProvider === IdentityProvider.CAL) {
    throw new Error(ErrorCode.SocialIdentityProviderRequired);
  }

  if (user.twoFactorEnabled) {
    throw new Error(ErrorCode.SocialIdentityProviderRequired);
  }

  // Remove me from Stripe
  await deleteStripeCustomer(user).catch((err) => log.warn("Failed to delete Stripe customer", err));

  // Remove my account
  await prisma.user.delete({
    where: {
      id: ctx.user.id,
    },
  });

  return;
};
