import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { isTeamOwner } from "@calcom/features/ee/teams/lib/queries";
import { TeamService } from "@calcom/lib/server/service/teamService";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TRemoveMemberInputSchema } from "./removeMember.schema";

type RemoveMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    sourceIp?: string;
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({ ctx, input }: RemoveMemberOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `removeMember.${ctx.user.id}`,
  });

  const { memberIds, teamIds, isOrg } = input;

  // Check PBAC permissions for each team
  const hasRemovePermission = await Promise.all(
    teamIds.map(async (teamId) => {
      // Get user's membership role in this team
      const membership = await prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          teamId: teamId,
        },
        select: {
          role: true,
        },
      });

      if (!membership) return false;

      // Check PBAC permissions for removing team members
      const permissions = await getSpecificPermissions({
        userId: ctx.user.id,
        teamId: teamId,
        resource: isOrg ? Resource.Organization : Resource.Team,
        userRole: membership.role,
        actions: [CustomAction.Remove],
        fallbackRoles: {
          [CustomAction.Remove]: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
      });

      return permissions[CustomAction.Remove];
    })
  ).then((results) => results.every((result) => result));

  // Check if user is trying to remove themselves (allowed for non-owners)
  const isRemovingSelf = memberIds.length === 1 && memberIds[0] === ctx.user.id;

  // Allow if user has remove permission OR if they're removing themselves
  if (!hasRemovePermission && !isRemovingSelf) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // TODO(SEAN): Remove this after PBAC is rolled out.
  // Check if any team has PBAC enabled
  const featuresRepository = new FeaturesRepository(prisma);
  const pbacEnabledForTeams = await Promise.all(
    teamIds.map(async (teamId) => await featuresRepository.checkIfTeamHasFeature(teamId, "pbac"))
  );
  const isAnyTeamPBACEnabled = pbacEnabledForTeams.some((enabled) => enabled);

  // Only apply traditional owner-based logic if PBAC is not enabled for any teams
  if (!isAnyTeamPBACEnabled) {
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

    // Check if user is trying to remove themselves from a team they own (prevent this)
    if (isRemovingSelf && hasRemovePermission) {
      // Additional check: ensure they're not an owner trying to remove themselves
      const isOwnerOfAnyTeam = await Promise.all(
        teamIds.map(async (teamId) => await isTeamOwner(ctx.user.id, teamId))
      ).then((results) => results.some((result) => result));

      if (isOwnerOfAnyTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can not remove yourself from a team you own.",
        });
      }
    }
  }

  await TeamService.removeMembers({ teamIds, userIds: memberIds, isOrg });
};

export default removeMemberHandler;
