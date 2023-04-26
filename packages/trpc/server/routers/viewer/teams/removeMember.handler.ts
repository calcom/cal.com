import type { PrismaClient } from "@prisma/client";

import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { closeComDeleteTeamMembership } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TRemoveMemberInputSchema } from "./removeMember.schema";

type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberOptions) => {
  const isAdmin = await isTeamAdmin(ctx.user.id, input.teamId);
  if (!isAdmin && ctx.user.id !== input.memberId) throw new TRPCError({ code: "UNAUTHORIZED" });
  // Only a team owner can remove another team owner.
  if ((await isTeamOwner(input.memberId, input.teamId)) && !(await isTeamOwner(ctx.user.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.id === input.memberId && isAdmin)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not remove yourself from a team you own.",
    });

  const membership = await prisma.membership.delete({
    where: {
      userId_teamId: { userId: input.memberId, teamId: input.teamId },
    },
    include: {
      user: true,
    },
  });

  // Deleted managed event types from this team from this member
  await ctx.prisma.eventType.deleteMany({
    where: { parent: { teamId: input.teamId }, userId: membership.userId },
  });

  // Sync Services
  closeComDeleteTeamMembership(membership.user);
  if (IS_TEAM_BILLING_ENABLED) await updateQuantitySubscriptionFromStripe(input.teamId);
};
