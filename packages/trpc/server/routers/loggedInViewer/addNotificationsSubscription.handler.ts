import { subscriptionSchema } from "@calcom/features/instant-meeting/schema";
import { sendNotification } from "@calcom/features/notifications/sendNotification";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TAddNotificationsSubscriptionInputSchema } from "./addNotificationsSubscription.schema";

type AddNotificationsSubscriptionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddNotificationsSubscriptionInputSchema;
};

const log = logger.getSubLogger({ prefix: ["[addNotificationsSubscriptionHandler]"] });

const parseBrowserSubscription = (subscription: string) => {
  try {
    return subscriptionSchema.safeParse(JSON.parse(subscription));
  } catch {
    return subscriptionSchema.safeParse(null);
  }
};

export const addNotificationsSubscriptionHandler = async ({
  ctx,
  input,
}: AddNotificationsSubscriptionOptions) => {
  const { user } = ctx;
  const { subscription } = input;

  const parsedSubscription = parseBrowserSubscription(subscription);

  if (!parsedSubscription.success) {
    log.error("Invalid subscription", parsedSubscription.error, JSON.stringify(subscription));
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid subscription",
    });
  }

  const endpoint = parsedSubscription.data.endpoint;

  await prisma.notificationsSubscriptions.upsert({
    where: {
      userId_type_identifier: {
        userId: user.id,
        type: "WEB_PUSH",
        identifier: endpoint,
      },
    },
    create: {
      userId: user.id,
      subscription,
      type: "WEB_PUSH",
      platform: "WEB",
      identifier: endpoint,
    },
    update: {
      subscription,
      lastSeenAt: new Date(),
    },
  });

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
