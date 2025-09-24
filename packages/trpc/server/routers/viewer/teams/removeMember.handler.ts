import { isTeamOwner } from "@calcom/features/ee/teams/lib/queries";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { TeamService } from "@calcom/lib/server/service/teamService";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TRemoveMemberInputSchema } from "./removeMember.schema";

type RemoveMemberOptions = {
  ctx: {
    user: {
      id: number;
      organization?: {
        isOrgAdmin: boolean;
      };
    };
  };
  input: TRemoveMemberInputSchema;
};

export const removeMemberHandler = async ({
  ctx: {
    user: { id: userId, organization },
  },
  input,
}: RemoveMemberOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `removeMember.${userId}`,
  });

  const { memberIds, teamIds, isOrg } = input;
  const isOrgAdmin = organization?.isOrgAdmin ?? false;

  const membershipRoles = await prisma.membership.findMany({
    where: {
      userId,
      teamId: {
        in: teamIds,
      },
      ...(isOrgAdmin
        ? {
            role: {
              not: MembershipRole.ADMIN,
            },
          }
        : {}),
    },
    select: {
      role: true,
      teamId: true,
    },
  });

  const userRoles = new Map<number, MembershipRole | null>(
    teamIds.map((teamId) => [teamId, isOrgAdmin ? MembershipRole.ADMIN : null])
  );

  membershipRoles.forEach((m) => {
    userRoles.set(m.teamId, m.role);
  });

  let hasRemovePermissionForAll = true;

  const resource = isOrg ? Resource.Organization : Resource.Team;
  const entries = Array.from(userRoles.entries());

  for (let i = 0; i < entries.length; i++) {
    const [teamId, userRole] = entries[i];
    if (!userRole) {
      hasRemovePermissionForAll = false;
      break;
    }
    const permissions = await getSpecificPermissions({
      userId,
      teamId,
      resource,
      userRole,
      actions: [CustomAction.Remove],
      fallbackRoles: {
        [CustomAction.Remove]: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
    });
    if (!permissions[CustomAction.Remove]) {
      hasRemovePermissionForAll = false;
      break;
    }
  }

  // Check if user is trying to remove themselves (allowed for non-owners)
  const isRemovingSelf = memberIds.length === 1 && memberIds[0] === userId;

  // Allow if user has remove permission OR if they're removing themselves
  if (!hasRemovePermissionForAll && !isRemovingSelf) {
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
            return (await isTeamOwner(memberId, teamId)) && !(await isTeamOwner(userId, teamId));
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
    if (isRemovingSelf && hasRemovePermissionForAll) {
      // Additional check: ensure they're not an owner trying to remove themselves
      const isOwnerOfAnyTeam = await Promise.all(
        teamIds.map(async (teamId) => await isTeamOwner(userId, teamId))
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
