import type { Prisma } from "@prisma/client";

import { updateTriggerForExistingBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdDeleteInputSchema } from "./delete.schema";

type CalIdDeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdDeleteInputSchema;
};

export const calIdDeleteHandler = async ({ ctx, input }: CalIdDeleteOptions) => {
  const { id } = input;

  const where: Prisma.WebhookWhereInput = { AND: [{ id: id }] };

  if (Array.isArray(where.AND)) {
    if (input.eventTypeId) {
      where.AND.push({ eventTypeId: input.eventTypeId });
    } else if (input.calIdTeamId) {
      where.AND.push({ calIdTeamId: input.calIdTeamId });
    } else if (ctx.user.role == "ADMIN") {
      where.AND.push({ OR: [{ platform: true }, { userId: ctx.user.id }] });
    } else {
      where.AND.push({ userId: ctx.user.id });
    }
  }

  const webhookToDelete = await prisma.webhook.findFirst({
    where,
  });

  if (webhookToDelete) {
    await prisma.webhook.delete({
      where: {
        id: webhookToDelete.id,
      },
    });

    await updateTriggerForExistingBookings(webhookToDelete, webhookToDelete.eventTriggers, []);
  }

  return {
    id,
  };
};
