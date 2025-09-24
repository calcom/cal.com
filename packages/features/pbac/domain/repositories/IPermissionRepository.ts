import type { MembershipRole } from "@calcom/prisma/enums";

import type { TeamPermissions } from "../models/Permission";
import type { PermissionString, Resource, CrudAction, CustomAction } from "../types/permission-registry";

export interface IPermissionRepository {
  getUserMemberships(userId: number): Promise<TeamPermissions[]>;

  getMembershipByMembershipId(membershipId: number): Promise<{
    id: number;
    teamId: number;
    userId: number;
    customRoleId: string | null;
    team: {
      parentId: number | null;
    };
  } | null>;

  getMembershipByUserAndTeam(
    userId: number,
    teamId: number
  ): Promise<{
    id: number;
    teamId: number;
    userId: number;
    customRoleId: string | null;
    team: {
      parentId: number | null;
    };
  } | null>;

  getOrgMembership(
    userId: number,
    orgId: number
  ): Promise<{
    id: number;
    teamId: number;
    userId: number;
    customRoleId: string | null;
  } | null>;

  getTeamById(teamId: number): Promise<{
    id: number;
    parentId: number | null;
  } | null>;

  checkRolePermission(roleId: string, permission: PermissionString): Promise<boolean>;
  checkRolePermissions(roleId: string, permissions: PermissionString[]): Promise<boolean>;

  /**
   * Gets all permissions for a specific resource in a team context
   */
  getResourcePermissions(
    userId: number,
    teamId: number,
    resource: Resource
  ): Promise<(CrudAction | CustomAction)[]>;

  /**
   * Gets all permissions for a specific resource by role ID
   */
  getResourcePermissionsByRoleId(roleId: string, resource: Resource): Promise<(CrudAction | CustomAction)[]>;

  /**
   * Gets all team IDs where the user has a specific permission
   */
  getTeamIdsWithPermission(params: {
    userId: number;
    permission: PermissionString;
    fallbackRoles: MembershipRole[];
  }): Promise<number[]>;

  /**
   * Gets all team IDs where the user has all of the specified permissions
   */
  getTeamIdsWithPermissions(params: {
    userId: number;
    permissions: PermissionString[];
    fallbackRoles: MembershipRole[];
  }): Promise<number[]>;
}
