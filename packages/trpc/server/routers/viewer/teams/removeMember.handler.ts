import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import removeMember from "@calcom/features/ee/teams/lib/removeMember";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { closeComDeleteTeamMembership } from "@calcom/lib/sync/SyncServiceManager";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TRemoveMemberInputSchema } from "./removeMember.schema";

const log = logger.getSubLogger({ prefix: ["viewer/teams/removeMember.handler"] });
type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
    sourceIp?: string;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `removeMember.${ctx.sourceIp}`,
  });

  const isAdmin = await isTeamAdmin(ctx.user.id, input.teamId);
  const isOrgAdmin = ctx.user.profile?.organizationId
    ? await isTeamAdmin(ctx.user.id, ctx.user.profile?.organizationId)
    : false;
  if (!(isAdmin || isOrgAdmin) && ctx.user.id !== input.memberId)
    throw new TRPCError({ code: "UNAUTHORIZED" });
  // Only a team owner can remove another team owner.
  if ((await isTeamOwner(input.memberId, input.teamId)) && !(await isTeamOwner(ctx.user.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  if (ctx.user.id === input.memberId && isAdmin && !isOrgAdmin)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not remove yourself from a team you own.",
    });

  const { membership } = await removeMember({
    teamId: input.teamId,
    memberId: input.memberId,
    isOrg: input.isOrg,
  });

  // Sync Services
  closeComDeleteTeamMembership(membership.user);
  if (IS_TEAM_BILLING_ENABLED) await updateQuantitySubscriptionFromStripe(input.teamId);
};

export default removeMemberHandler;
