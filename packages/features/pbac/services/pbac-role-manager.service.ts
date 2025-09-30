import { MembershipRole } from "@calcom/prisma/enums";

import { RoleManagementError, RoleManagementErrorCode } from "../domain/errors/role-management.error";
import { DEFAULT_ROLE_IDS } from "../lib/constants";
import type { IRoleManager } from "./role-manager.interface";
import { PermissionCheckService } from "./permission-check.service";
import { RoleService } from "./role.service";

export class PBACRoleManager implements IRoleManager {
  public isPBACEnabled = true;

  constructor(
    private readonly roleService: RoleService,
    private readonly permissionCheckService: PermissionCheckService
  ) {}

  async checkPermissionToChangeRole(
    userId: number,
    targetId: number,
    scope: "org" | "team",
    // Not required for this instance
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _memberId?: number,
    // Not required for this instance
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _newRole?: MembershipRole | string
  ): Promise<void> {
    const hasPermission = await this.permissionCheckService.checkPermission({
      userId,
      teamId: targetId,
      permission: scope === "team" ? "team.changeMemberRole" : "organization.changeMemberRole",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw new RoleManagementError(
        "You do not have permission to change roles",
        RoleManagementErrorCode.UNAUTHORIZED
      );
    }
  }

  async assignRole(
    _userId: number,
    organizationId: number,
    role: MembershipRole | string,
    membershipId: number
  ): Promise<void> {
    // Check if role is one of the default MembershipRole enum values
    const isDefaultRole = role in DEFAULT_ROLE_IDS;

    // Also check if the role is a default role ID value
    const isDefaultRoleId = Object.values(DEFAULT_ROLE_IDS).includes(role as any);

    if (isDefaultRole) {
      // Handle enum values like MembershipRole.ADMIN
      await this.roleService.assignRoleToMember(DEFAULT_ROLE_IDS[role as MembershipRole], membershipId);
    } else if (isDefaultRoleId) {
      // Handle default role IDs like "admin_role"
      await this.roleService.assignRoleToMember(role as string, membershipId);
    } else {
      // Handle custom roles
      const roleExists = await this.roleService.roleBelongsToTeam(role as string, organizationId);
      if (!roleExists) {
        throw new RoleManagementError(
          "You do not have access to this role",
          RoleManagementErrorCode.INVALID_ROLE
        );
      }
      await this.roleService.assignRoleToMember(role as string, membershipId);
    }
  }

  async getAllRoles(organizationId: number): Promise<{ id: string; name: string }[]> {
    const roles = await this.roleService.getTeamRoles(organizationId);
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
    }));
  }

  async getTeamRoles(teamId: number): Promise<{ id: string; name: string }[]> {
    const roles = await this.roleService.getTeamRoles(teamId);
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
    }));
  }
}