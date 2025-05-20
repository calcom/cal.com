import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TRemoveNotificationsSubscriptionInputSchema } from "./removeNotificationsSubscription.schema";

type AddSecondaryEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveNotificationsSubscriptionInputSchema;
};

export const removeNotificationsSubscriptionHandler = async ({ ctx }: AddSecondaryEmailOptions) => {
  const { user } = ctx;

  // We just use findFirst because there will only be single unique subscription for a user
  const subscriptionToDelete = await ctx.ctx.ctx.prisma.notificationsSubscriptions.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (subscriptionToDelete) {
    await ctx.ctx.ctx.prisma.notificationsSubscriptions.delete({
      where: {
        id: subscriptionToDelete.id,
      },
    });
  }

  return {
    message: "Subscription removed successfully",
  };
};
