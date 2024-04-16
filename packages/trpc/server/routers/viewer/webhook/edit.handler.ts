import { updateTriggerForExistingBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TEditInputSchema } from "./edit.schema";

type EditOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TEditInputSchema;
};

export const editHandler = async ({ input, ctx }: EditOptions) => {
  const { id, ...data } = input;

  const webhook = await prisma.webhook.findFirst({
    where: {
      id,
    },
  });

  if (!webhook) {
    return null;
  }

  if (webhook.platform) {
    const { user } = ctx;
    if (user?.role !== "ADMIN") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  const updatedWebhook = await prisma.webhook.update({
    where: {
      id,
    },
    data,
  });

  await updateTriggerForExistingBookings(webhook, webhook.eventTriggers, updatedWebhook.eventTriggers);

  return updatedWebhook;
};
