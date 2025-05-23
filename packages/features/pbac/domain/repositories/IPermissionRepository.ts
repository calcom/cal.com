import type { TeamPermissions } from "../models/Permission";
import type { PermissionString } from "../types/permission-registry";

export interface IPermissionRepository {
  getUserMemberships(userId: number): Promise<TeamPermissions[]>;

  getMembershipByMembershipId(membershipId: number): Promise<{
    id: number;
    teamId: number;
    userId: number;
    customRoleId: string | null;
    team_parentId?: number;
  } | null>;

  getMembershipByUserAndTeam(
    userId: number,
    teamId: number
  ): Promise<{
    id: number;
    teamId: number;
    userId: number;
    customRoleId: string | null;
    team_parentId?: number;
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

  checkRolePermission(roleId: string, permission: PermissionString): Promise<boolean>;
  checkRolePermissions(roleId: string, permissions: PermissionString[]): Promise<boolean>;
}
