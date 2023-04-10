import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TListInputSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListOptions) => {
  const where: Prisma.WebhookWhereInput = {
    /* Don't mixup zapier webhooks with normal ones */
    AND: [{ appId: !input?.appId ? null : input.appId }],
  };
  if (Array.isArray(where.AND)) {
    if (input?.eventTypeId) {
      where.AND?.push({ eventTypeId: input.eventTypeId });
    } else {
      where.AND?.push({ userId: ctx.user.id });
    }
  }

  return await prisma.webhook.findMany({
    where,
  });
};
