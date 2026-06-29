import { z } from "zod";

import { sendNotification } from "@calcom/features/notifications/sendNotification";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/i18n/server";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TAddNotificationsSubscriptionInputSchema } from "./addNotificationsSubscription.schema";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
});

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

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(subscription);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid subscription",
    });
  }

  const parsedSubscription = subscriptionSchema.safeParse(parsedJson);

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

  const t = await getTranslation(user.locale ?? "en", "common");

  sendNotification({
    subscription: {
      endpoint: parsedSubscription.data.endpoint,
      keys: {
        auth: parsedSubscription.data.keys.auth,
        p256dh: parsedSubscription.data.keys.p256dh,
      },
    },
    title: t("test_notification_title"),
    body: t("test_notification_body"),
    url: WEBAPP_URL,
    requireInteraction: false,
    type: "TEST_NOTIFICATION",
  });

  return {
    message: "Subscription added successfully",
  };
};
