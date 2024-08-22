import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TRemoveNotificationsSubscriptionInputSchema } from "./removeNotificationsSubscription.schema";

type AddSecondaryEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveNotificationsSubscriptionInputSchema;
};

export const removeNotificationsSubscriptionHandler = async ({ ctx, input }: AddSecondaryEmailOptions) => {
  const { user } = ctx;
  const { subscription } = input;

  // We just use findFirst because there will only be single unique subscription for a user
  const subscriptionToDelete = await prisma.notificationsSubscriptions.findFirst({
    where: {
      userId: user.id,
      subscription,
    },
  });

  if (subscriptionToDelete) {
    await prisma.notificationsSubscriptions.delete({
      where: {
        id: subscriptionToDelete.id,
      },
    });
  }

  return {
    message: "Subscription removed successfully",
  };
};
