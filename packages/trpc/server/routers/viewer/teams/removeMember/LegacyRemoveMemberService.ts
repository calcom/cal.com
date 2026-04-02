import * as teamQueries from "@calcom/features/ee/teams/lib/queries";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { BaseRemoveMemberService } from "./BaseRemoveMemberService";
import type { RemoveMemberContext, RemoveMemberPermissionResult } from "./IRemoveMemberService";

export class LegacyRemoveMemberService extends BaseRemoveMemberService {
  constructor(private teamRepository: TeamRepository) {
    super();
  }

  private async validateTeamsBelongToOrganization(
    teamIds: number[],
    organizationId: number
  ): Promise<boolean> {
    const teams = await this.teamRepository.findByIdsAndOrgId({ teamIds, orgId: organizationId });
    const validTeamIds = new Set(teams.map((t) => t.id));
    return teamIds.every((id) => validTeamIds.has(id));
  }

  async checkRemovePermissions(context: RemoveMemberContext): Promise<RemoveMemberPermissionResult> {
    const { userId, isOrgAdmin, organizationId, teamIds } = context;

    if (isOrgAdmin) {
      if (!organizationId) {
        return { hasPermission: false };
      }

      const teamsValid = await this.validateTeamsBelongToOrganization(teamIds, organizationId);
      if (!teamsValid) {
        return { hasPermission: false };
      }

      const userRoles = new Map<number, MembershipRole | null>();
      teamIds.forEach((teamId) => {
        userRoles.set(teamId, MembershipRole.ADMIN);
      });
      return {
        hasPermission: true,
        userRoles,
      };
    }

    // Get all memberships in a single query
    const membershipRoles = await prisma.membership.findMany({
      where: {
        userId,
        teamId: {
          in: teamIds,
        },
      },
      select: {
        role: true,
        teamId: true,
      },
    });

    // Create a map for O(1) lookup
    const userRoles = new Map<number, MembershipRole | null>();
    membershipRoles.forEach((m) => {
      userRoles.set(m.teamId, m.role);
    });

    // Check if user has admin or owner role in all teams
    const allowedRoles: MembershipRole[] = [MembershipRole.ADMIN, MembershipRole.OWNER];
    let hasPermission = true;

    for (const teamId of teamIds) {
      const userRole = userRoles.get(teamId);
      if (!userRole || !allowedRoles.includes(userRole)) {
        hasPermission = false;
        break;
      }
    }

    return {
      hasPermission,
      userRoles,
    };
  }

  async validateRemoval(context: RemoveMemberContext, hasPermission: boolean): Promise<void> {
    const { userId, memberIds, teamIds, isOrgAdmin } = context;
    const isRemovingSelf = memberIds.length === 1 && memberIds[0] === userId;

    // Only a team owner can remove another team owner (org admins are exempt)
    if (!isOrgAdmin) {
      const isAnyMemberOwnerAndCurrentUserNotOwner = await Promise.all(
        memberIds.map(async (memberId) => {
          const isAnyTeamOwnerAndCurrentUserNotOwner = await Promise.all(
            teamIds.map(async (teamId) => {
              return (
                (await teamQueries.isTeamOwner(memberId, teamId)) &&
                !(await teamQueries.isTeamOwner(userId, teamId))
              );
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
    }

    // Check if user is trying to remove themselves from a team they own (prevent this)
    if (isRemovingSelf && hasPermission) {
      const isOwnerOfAnyTeam = await Promise.all(
        teamIds.map(async (teamId) => await teamQueries.isTeamOwner(userId, teamId))
      ).then((results) => results.some((result) => result));

      if (isOwnerOfAnyTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can not remove yourself from a team you own.",
        });
      }
    }
  }
}
