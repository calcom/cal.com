import { PrismaWebPushSubscriptionRepository } from "@calcom/features/notifications/prisma-web-push-subscription-repository";
import { WebPushSubscriptionService } from "@calcom/features/notifications/web-push-subscription-service";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
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

export const removeNotificationsSubscriptionHandler = async ({
  ctx,
  input,
}: RemoveNotificationsSubscriptionOptions) => {
  const { user } = ctx;

  const repository = new PrismaWebPushSubscriptionRepository(prisma);
  const service = new WebPushSubscriptionService(repository);

  try {
    await service.remove(user.id, input.subscription);
  } catch (error) {
    if (error instanceof ErrorWithCode && error.code === ErrorCode.BadRequest) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid subscription",
      });
    }
    throw error;
  }

  return {
    message: "Subscription removed successfully",
  };
};
