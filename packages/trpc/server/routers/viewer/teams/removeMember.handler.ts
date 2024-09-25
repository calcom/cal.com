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

  const { memberIds, teamIds, isOrg } = input;

  const isAdmin = await Promise.all(
    teamIds.map(async (teamId) => await isTeamAdmin(ctx.user.id, teamId))
  ).then((results) => results.every((result) => result));

  const isOrgAdmin = ctx.user.profile?.organizationId
    ? await isTeamAdmin(ctx.user.id, ctx.user.profile?.organizationId)
    : false;

  if (!(isAdmin || isOrgAdmin) && memberIds.every((memberId) => ctx.user.id !== memberId))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  // Only a team owner can remove another team owner.
  const isAnyMemberOwnerAndCurrentUserNotOwner = await Promise.all(
    memberIds.map(async (memberId) => {
      const isAnyTeamOwnerAndCurrentUserNotOwner = await Promise.all(
        teamIds.map(async (teamId) => {
          return (await isTeamOwner(memberId, teamId)) && !(await isTeamOwner(ctx.user.id, teamId));
        })
      ).then((results) => results.some((result) => result));

      return isAnyTeamOwnerAndCurrentUserNotOwner;
    })
  ).then((results) => results.some((result) => result));

  if (isAnyMemberOwnerAndCurrentUserNotOwner) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Only a team owner can remove another team owner.",
    });
  }

  if (memberIds.some((memberId) => ctx.user.id === memberId) && isAdmin && !isOrgAdmin)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can not remove yourself from a team you own.",
    });

  const deleteMembershipPromises = [];

  for (const memberId of memberIds) {
    for (const teamId of teamIds) {
      deleteMembershipPromises.push(
        removeMember({
          teamId,
          memberId,
          isOrg,
        })
      );
    }
  }

  const memberships = await Promise.all(deleteMembershipPromises);

  // Sync Services
  memberships.flatMap((m) => closeComDeleteTeamMembership(m.membership.user));

  if (IS_TEAM_BILLING_ENABLED) {
    for (const teamId of teamIds) {
      await updateQuantitySubscriptionFromStripe(teamId);
    }
  }
};

export default removeMemberHandler;
