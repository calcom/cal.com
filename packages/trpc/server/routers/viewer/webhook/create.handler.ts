import { v4 } from "uuid";

import { updateTriggerForExistingBookings } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { prisma } from "@calcom/prisma";
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
  if (input.platform) {
    const { user } = ctx;
    if (user?.role !== "ADMIN") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return await prisma.webhook.create({
      data: {
        id: v4(),
        ...input,
      },
    });
  }
  if (input.eventTypeId || input.teamId) {
    const webhook = await prisma.webhook.create({
      data: {
        id: v4(),
        ...input,
      },
    });

    await updateTriggerForExistingBookings(webhook, [], webhook.eventTriggers);
    return webhook;
  }

  return await prisma.webhook.create({
    data: {
      id: v4(),
      userId: ctx.user.id,
      ...input,
    },
  });
};
