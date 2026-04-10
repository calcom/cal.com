import { sendWebPushTestNotification } from "@calcom/features/notifications/send-web-push-test-notification";
import { PrismaWebPushSubscriptionRepository } from "@calcom/features/notifications/prisma-web-push-subscription-repository";
import { WebPushSubscriptionService } from "@calcom/features/notifications/web-push-subscription-service";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
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

export const addNotificationsSubscriptionHandler = async ({
  ctx,
  input,
}: AddNotificationsSubscriptionOptions) => {
  const { user } = ctx;
  const { subscription } = input;

  const repository = new PrismaWebPushSubscriptionRepository(prisma);
  const service = new WebPushSubscriptionService(repository);

  try {
    const { parsed } = await service.register(user.id, subscription);
    sendWebPushTestNotification(parsed);
  } catch (error) {
    if (error instanceof ErrorWithCode && error.code === ErrorCode.BadRequest) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid subscription",
      });
    }
    log.error("Failed to register web-push subscription", error);
    throw error;
  }

  return {
    message: "Subscription added successfully",
  };
};
