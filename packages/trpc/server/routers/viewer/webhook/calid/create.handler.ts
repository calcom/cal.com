import type { Webhook } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { v4 } from "uuid";

import { updateTriggerForExistingBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TCalIdCreateInputSchema } from "./create.schema";

type CalIdCreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdCreateInputSchema;
};

export const calIdCreateHandler = async ({ ctx, input }: CalIdCreateOptions) => {
  const { user } = ctx;

  const webhookData: Prisma.WebhookCreateInput = {
    id: v4(),
    ...input,
  };
  // Add userId if eventTypeId and calIdTeamId are not provided
  if (!input.eventTypeId && !input.calIdTeamId) {
    webhookData.user = { connect: { id: user.id } };
  }

  if (input.eventTypeId) {
    const parentManagedEvt = await prisma.eventType.findFirst({
      where: {
        id: input.eventTypeId,
        parentId: {
          not: null,
        },
      },
      select: {
        parentId: true,
        metadata: true,
      },
    });

    if (parentManagedEvt?.parentId) {
      const isLocked = !EventTypeMetaDataSchema.parse(parentManagedEvt.metadata)?.managedEventConfig
        ?.unlockedFields?.webhooks;
      if (isLocked) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }
  }

  let newWebhook: Webhook;
  try {
    newWebhook = await prisma.webhook.create({
      data: webhookData,
    });
  } catch (error) {
    // Avoid printing raw prisma error on frontend
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create webhook" });
  }

  await updateTriggerForExistingBookings(newWebhook, [], newWebhook.eventTriggers);

  return newWebhook;
};
