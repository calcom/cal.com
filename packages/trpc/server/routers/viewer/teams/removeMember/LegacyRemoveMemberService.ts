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

    // Batch fetch all relevant owner memberships in a single query
    // instead of making M x T x 2 individual isTeamOwner calls
    const allUserIdsToCheck = isOrgAdmin ? [] : [...new Set([...memberIds, userId])];

    const ownerMemberships =
      allUserIdsToCheck.length > 0
        ? await prisma.membership.findMany({
            where: {
              userId: { in: allUserIdsToCheck },
              teamId: { in: teamIds },
              accepted: true,
              role: MembershipRole.OWNER,
            },
            select: {
              userId: true,
              teamId: true,
            },
          })
        : [];

    // Build a Set for O(1) ownership lookups
    const ownerSet = new Set(ownerMemberships.map((m) => `${m.userId}:${m.teamId}`));
    const isOwner = (uid: number, tid: number) => ownerSet.has(`${uid}:${tid}`);

    // Only a team owner can remove another team owner (org admins are exempt)
    if (!isOrgAdmin) {
      const isAnyMemberOwnerAndCurrentUserNotOwner = memberIds.some((memberId) =>
        teamIds.some((teamId) => isOwner(memberId, teamId) && !isOwner(userId, teamId))
      );

      if (isAnyMemberOwnerAndCurrentUserNotOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only a team owner can remove another team owner.",
        });
      }
    }

    // Check if user is trying to remove themselves from a team they own (prevent this)
    if (isRemovingSelf && hasPermission) {
      const isOwnerOfAnyTeam = teamIds.some((teamId) => isOwner(userId, teamId));

      if (isOwnerOfAnyTeam) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can not remove yourself from a team you own.",
        });
      }
    }
  }
}
