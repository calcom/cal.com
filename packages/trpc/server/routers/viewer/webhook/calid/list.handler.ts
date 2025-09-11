import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdListInputSchema } from "./list.schema";

type CalIdListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdListInputSchema;
};

export const calIdListHandler = async ({ ctx, input }: CalIdListOptions) => {
  const where: Prisma.WebhookWhereInput = {
    /* Don't mixup zapier webhooks with normal ones */
    AND: [{ appId: !input?.appId ? null : input.appId }],
  };

  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      calIdTeams: {
        select: {
          calIdTeamId: true,
        },
      },
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
        OR: [
          { userId: ctx.user.id },
          { calIdTeamId: { in: user?.calIdTeams.map((membership) => membership.calIdTeamId) } },
        ],
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
