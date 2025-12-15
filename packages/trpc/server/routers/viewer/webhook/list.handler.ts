import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { Webhook } from "@calcom/features/webhooks/lib/dto/types";
import { WebhookOutputMapper } from "@calcom/features/webhooks/lib/infrastructure/mappers/WebhookOutputMapper";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TListInputSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListOptions): Promise<Webhook[]> => {
  const where: Prisma.WebhookWhereInput = {
    /* Don't mixup zapier webhooks with normal ones */
    AND: [{ appId: !input?.appId ? null : input.appId }],
  };

  const user = await prisma.user.findUnique({
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
      const permissionService = new PermissionCheckService();
      const teamIds = user?.teams?.map((m) => m.teamId) ?? [];
      const allowedTeamIds = (
        await Promise.all(
          teamIds.map(async (teamId) => {
            const ok = await permissionService.checkPermission({
              userId: ctx.user.id,
              teamId,
              permission: "webhook.read",
              fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
            });
            return ok ? teamId : null;
          })
        )
      ).filter((x): x is number => x !== null);

      console.log("Allowed Team IDs:", allowedTeamIds);

      where.AND?.push({
        OR: [{ userId: ctx.user.id }, ...(allowedTeamIds.length ? [{ teamId: { in: allowedTeamIds } }] : [])],
      });
    }

    if (input?.eventTriggers) {
      where.AND?.push({ eventTriggers: { hasEvery: input.eventTriggers } });
    }
  }

  const webhooks = await prisma.webhook.findMany({
    where,
    select: {
      id: true,
      subscriberUrl: true,
      payloadTemplate: true,
      appId: true,
      secret: true,
      active: true,
      eventTriggers: true,
      eventTypeId: true,
      teamId: true,
      userId: true,
      time: true,
      timeUnit: true,
      version: true,
      createdAt: true,
      platform: true,
      platformOAuthClientId: true,
    },
  });

  // Map Prisma webhooks to domain Webhook objects
  return WebhookOutputMapper.toWebhookList(webhooks);
};
