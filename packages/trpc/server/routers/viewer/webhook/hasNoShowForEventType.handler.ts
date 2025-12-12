import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaClient } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { THasNoShowForEventTypeInputSchema } from "./hasNoShowForEventType.schema";

type HasNoShowOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: THasNoShowForEventTypeInputSchema;
};

export const hasNoShowForEventTypeHandler = async ({ ctx, input }: HasNoShowOptions) => {
  const userTeamIds = await MembershipRepository.findUserTeamIds({ userId: ctx.user.id });

  const eventType = await ctx.prisma.eventType.findFirst({
    where: {
      id: input.eventTypeId,
      OR: [
        { userId: ctx.user.id },
        { users: { some: { id: ctx.user.id } } },
        { AND: [{ teamId: { not: null } }, { teamId: { in: userTeamIds } }] },
      ],
    },
    select: {
      id: true,
      teamId: true,
      parentId: true,
      team: {
        select: {
          id: true,
          parentId: true,
        },
      },
    },
  });

  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  // Use parentId directly from the event type (for managed children)
  const managedParentEventTypeId = eventType.parentId ?? null;

  // Build teamIds array (include orgId if present)
  const teamIds: number[] = [];
  if (eventType.teamId) {
    teamIds.push(eventType.teamId);
  }
  if (eventType.team?.parentId) {
    teamIds.push(eventType.team.parentId);
  }

  // Build OR conditions for webhook matching
  const webhookWhereConditions = [];

  // Platform webhooks (always included)
  webhookWhereConditions.push({ platform: true });

  // User webhooks
  if (ctx.user.id) {
    webhookWhereConditions.push({ userId: ctx.user.id });
  }

  // Event type webhooks
  if (input.eventTypeId) {
    webhookWhereConditions.push({ eventTypeId: input.eventTypeId });
  }

  // Parent event type webhooks (for managed children)
  if (managedParentEventTypeId) {
    webhookWhereConditions.push({ eventTypeId: managedParentEventTypeId });
  }

  // Team/Org webhooks
  if (teamIds.length > 0) {
    webhookWhereConditions.push({ teamId: { in: teamIds } });
  }

  // Query webhooks with host trigger (use findFirst to stop at first match)
  const hostWebhook = await ctx.prisma.webhook.findFirst({
    where: {
      active: true,
      eventTriggers: {
        has: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
      },
      OR: webhookWhereConditions,
    },
    select: {
      id: true,
    },
  });

  // Query webhooks with guest trigger (use findFirst to stop at first match)
  const guestWebhook = await ctx.prisma.webhook.findFirst({
    where: {
      active: true,
      eventTriggers: {
        has: WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
      },
      OR: webhookWhereConditions,
    },
    select: {
      id: true,
    },
  });

  return {
    hasHostNoShow: !!hostWebhook,
    hasGuestNoShow: !!guestWebhook,
  };
};
