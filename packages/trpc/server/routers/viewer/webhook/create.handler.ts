import type { Webhook } from "@prisma/client";
import { v4 } from "uuid";

import { handleAuditLogTrigger } from "@calcom/features/audit-logs/lib/handleAuditLogTrigger";
import { updateTriggerForExistingBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
import { AuditLogWebhookTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  let newWebhook: Webhook;
  if (input.platform) {
    const { user } = ctx;
    if (user?.role !== "ADMIN") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    newWebhook = await prisma.webhook.create({
      data: {
        id: v4(),
        ...input,
      },
    });
  } else if (input.eventTypeId || input.teamId) {
    newWebhook = await prisma.webhook.create({
      data: {
        id: v4(),
        ...input,
      },
    });
  } else {
    newWebhook = await prisma.webhook.create({
      data: {
        id: v4(),
        userId: ctx.user.id,
        ...input,
      },
    });
  }

  await updateTriggerForExistingBookings(newWebhook, [], newWebhook.eventTriggers);

  return {
    result: newWebhook,
    data: {
      webhook: newWebhook,
      trigger: AuditLogWebhookTriggerEvents.WEBHOOK_CREATED,
    },
  };
};
