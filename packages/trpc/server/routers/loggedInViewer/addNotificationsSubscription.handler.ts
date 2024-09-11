import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TAddNotificationsSubscriptionInputSchema } from "./addNotificationsSubscription.schema";

type AddSecondaryEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddNotificationsSubscriptionInputSchema;
};

export const addNotificationsSubscriptionHandler = async ({ ctx, input }: AddSecondaryEmailOptions) => {
  const { user } = ctx;
  const { subscription } = input;

  const existingSubscription = await prisma.notificationsSubscriptions.findFirst({
    where: { userId: user.id, subscription },
  });

  if (!existingSubscription) {
    await prisma.notificationsSubscriptions.create({
      data: { userId: user.id, subscription },
    });
  }

  return {
    message: "Subscription added successfully",
  };
};
