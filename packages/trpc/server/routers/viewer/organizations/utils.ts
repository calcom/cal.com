import { TeamRepository } from "@calcom/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddMembersToTeams } from "./addMembersToTeams.schema";

interface AddBulkToTeamProps {
  user: NonNullable<TrpcSessionUser>;
  input: TAddMembersToTeams;
}

export const addMembersToTeams = async ({ user, input }: AddBulkToTeamProps) => {
  if (!user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  const teamRepository = new TeamRepository(prisma);
  const teamsNotBelongingToOrg = await teamRepository.findTeamsNotBelongingToOrgByIds({
    teamIds: input.teamIds,
    orgId: user.organizationId,
  });

  if (teamsNotBelongingToOrg.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `One or more teams do not belong to your organization: ${teamsNotBelongingToOrg
        .map((team) => team.id)
        .join(", ")}`,
    });
  }

  // Check if user has permission to invite team members in the organization
  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: user.organizationId,
    permission: "team.invite",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to add members to teams in this organization",
    });
  }

  const usersInOrganization = await prisma.membership.findMany({
    where: {
      teamId: user.organizationId,
      user: {
        id: {
          in: input.userIds,
        },
      },
    },
    distinct: ["userId"],
  });

  // Throw error if any of the users are not in the organization. They should be invited to the organization via the onboaring flow first.
  if (usersInOrganization.length !== input.userIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more users are not in the organization",
    });
  }

  // loop over all users and check if they are already in team they are being invited to
  const usersInTeams = await prisma.membership.findMany({
    where: {
      userId: {
        in: input.userIds,
      },
      teamId: {
        in: input.teamIds,
      },
    },
  });

  // Filter out users who are already in teams they are being invited to
  const filteredUserIds = input.userIds.filter((userId) => {
    return !usersInTeams.some((membership) => membership.userId === userId);
  });

  const membershipData = filteredUserIds.flatMap((userId) =>
    input.teamIds.map((teamId) => {
      const userMembership = usersInOrganization.find((membership) => membership.userId === userId);
      const accepted = userMembership && userMembership.accepted;
      return {
        createdAt: new Date(),
        userId,
        teamId,
        role: MembershipRole.MEMBER,
        accepted: accepted || false,
      };
    })
  );

  const teamService = new TeamService();
  await teamService.addMembersToTeams({ membershipData });

  return {
    success: true,
    invitedTotalUsers: input.userIds.length,
  };
};
