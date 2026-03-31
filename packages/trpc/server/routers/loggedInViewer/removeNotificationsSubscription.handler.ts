import { subscriptionSchema } from "@calcom/features/instant-meeting/schema";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TRemoveNotificationsSubscriptionInputSchema } from "./removeNotificationsSubscription.schema";

type RemoveNotificationsSubscriptionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveNotificationsSubscriptionInputSchema;
};

const parseBrowserSubscription = (subscription: string) => {
  try {
    return subscriptionSchema.safeParse(JSON.parse(subscription));
  } catch {
    return subscriptionSchema.safeParse(null);
  }
};

export const removeNotificationsSubscriptionHandler = async ({
  ctx,
  input,
}: RemoveNotificationsSubscriptionOptions) => {
  const { user } = ctx;

  const parsedSubscription = parseBrowserSubscription(input.subscription);

  if (!parsedSubscription.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid subscription",
    });
  }

  await prisma.notificationsSubscriptions.deleteMany({
    where: {
      userId: user.id,
      type: "WEB_PUSH",
      identifier: parsedSubscription.data.endpoint,
    },
  });

  return {
    message: "Subscription removed successfully",
  };
};
