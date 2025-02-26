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

  const user = await prisma.user.findFirst({
    where: {
      id: ctx.user.id,
    },
    select: {
      teams: true,
    },
  });

  if (Array.isArray(where.AND)) {
    if (input?.eventTypeId) {
      const managedParentEvt = await prisma.eventType.findFirst({
        where: {
          id: input.eventTypeId,
          parentId: {
            not: null,
          },
        },
        select: {
          parentId: true,
        },
      });

      if (managedParentEvt?.parentId) {
        where.AND?.push({
          OR: [{ eventTypeId: input.eventTypeId }, { eventTypeId: managedParentEvt.parentId, active: true }],
        });
      } else {
        where.AND?.push({ eventTypeId: input.eventTypeId });
      }
    } else {
      where.AND?.push({
        OR: [{ userId: ctx.user.id }, { teamId: { in: user?.teams.map((membership) => membership.teamId) } }],
      });
    }

    if (input?.eventTriggers) {
      where.AND?.push({ eventTriggers: { hasEvery: input.eventTriggers } });
    }
  }

  return await prisma.webhook.findMany({
    where,
  });
};
