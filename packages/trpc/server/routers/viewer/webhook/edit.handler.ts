import { updateTriggerForExistingBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TEditInputSchema } from "./edit.schema";

type EditOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TEditInputSchema;
};

export const editHandler = async ({ input }: EditOptions) => {
  const { id, ...data } = input;

  const webhook = await prisma.webhook.findFirst({
    where: {
      id,
    },
  });

  if (!webhook) {
    return null;
  }

  const updatedWebhook = await prisma.webhook.update({
    where: {
      id,
    },
    data,
    select: {
      eventTriggers: true,
    },
  });

  if (!webhook.eventTypeId) return updatedWebhook;

  await updateTriggerForExistingBookings(webhook, webhook.eventTriggers, updatedWebhook.eventTriggers);

  return updatedWebhook;
};
