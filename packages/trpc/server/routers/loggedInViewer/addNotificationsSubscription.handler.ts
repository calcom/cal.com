import { subscriptionSchema } from "@calcom/features/instant-meeting/schema";
import { sendNotification } from "@calcom/features/notifications/sendNotification";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TAddNotificationsSubscriptionInputSchema } from "./addNotificationsSubscription.schema";

type AddSecondaryEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddNotificationsSubscriptionInputSchema;
};

const log = logger.getSubLogger({ prefix: ["[addNotificationsSubscriptionHandler]"] });

export const addNotificationsSubscriptionHandler = async ({ ctx, input }: AddSecondaryEmailOptions) => {
  const { user } = ctx;
  const { subscription } = input;

  const parsedSubscription = subscriptionSchema.safeParse(JSON.parse(subscription));

  if (!parsedSubscription.success) {
    log.error("Invalid subscription", parsedSubscription.error, JSON.stringify(subscription));
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid subscription",
    });
  }

  const existingSubscription = await prisma.notificationsSubscriptions.findFirst({
    where: { userId: user.id },
  });

  if (!existingSubscription) {
    await prisma.notificationsSubscriptions.create({
      data: { userId: user.id, subscription },
    });
  } else {
    await prisma.notificationsSubscriptions.update({
      where: { id: existingSubscription.id },
      data: { userId: user.id, subscription },
    });
  }

  // send test notification
  sendNotification({
    subscription: {
      endpoint: parsedSubscription.data.endpoint,
      keys: {
        auth: parsedSubscription.data.keys.auth,
        p256dh: parsedSubscription.data.keys.p256dh,
      },
    },
    title: "Test Notification",
    body: "Push Notifications activated successfully",
    url: "https://app.cal.com/",
    requireInteraction: false,
    type: "TEST_NOTIFICATION",
  });

  return {
    message: "Subscription added successfully",
  };
};
