import * as teamQueries from "@calcom/features/ee/teams/lib/queries";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { CustomAction, Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { BaseRemoveMemberService } from "./BaseRemoveMemberService";
import type { RemoveMemberContext, RemoveMemberPermissionResult } from "./IRemoveMemberService";

export class PBACRemoveMemberService extends BaseRemoveMemberService {
  private permissionService = new PermissionCheckService();

  async checkRemovePermissions(context: RemoveMemberContext): Promise<RemoveMemberPermissionResult> {
    const { userId, teamIds, isOrg } = context;

    const resource = isOrg ? Resource.Organization : Resource.Team;
    const removePermission = PermissionMapper.toPermissionString({
      resource,
      action: CustomAction.Remove,
    });

    const teamsWithPermission = await this.permissionService.getTeamIdsWithPermission({
      userId,
      permission: removePermission,
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    // Convert to Set for O(1) lookup
    const teamsWithPermissionSet = new Set(teamsWithPermission);

    // Check if user has permission for ALL requested teams
    const hasPermission = teamIds.every((teamId) => teamsWithPermissionSet.has(teamId));

    return {
      hasPermission,
    };
  }

  async validateRemoval(context: RemoveMemberContext, hasPermission: boolean): Promise<void> {
    const { userId, memberIds, teamIds } = context;
    const isRemovingSelf = memberIds.length === 1 && memberIds[0] === userId;

    /**
     * TODO: Figure out the best way to prevent someone bricking a team
     *       by removing all people with updateRole permissions
     */
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
