import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { RoleManagementError, RoleManagementErrorCode } from "../domain/errors/role-management.error";
import { DEFAULT_ROLE_IDS } from "../lib/constants";
import type { PermissionCheckService } from "./permission-check.service";
import type { RoleService } from "./role.service";
import type { IRoleManager } from "./role-manager.interface";

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
    _memberId?: number,
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

  private async validateNotLastOwner(
    organizationId: number,
    membershipId: number,
    newRole: MembershipRole | string
  ): Promise<void> {
    // Get current membership details
    const currentMembership = await prisma.membership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        customRoleId: true,
        role: true,
        teamId: true,
      },
    });

    if (!currentMembership) {
      throw new RoleManagementError("Membership not found", RoleManagementErrorCode.UNAUTHORIZED);
    }

    // Check if the current membership has owner role (either through customRoleId or role field)
    const hasOwnerRole =
      currentMembership.customRoleId === DEFAULT_ROLE_IDS[MembershipRole.OWNER] ||
      currentMembership.role === MembershipRole.OWNER;

    // If current membership is not an owner, no validation needed
    if (!hasOwnerRole) {
      return;
    }

    // Check if new role is still owner - if so, no validation needed
    const newRoleIsOwner =
      newRole === MembershipRole.OWNER || newRole === DEFAULT_ROLE_IDS[MembershipRole.OWNER];

    if (newRoleIsOwner) {
      return;
    }

    // Count total owners in the organization/team
    const ownerCount = await prisma.membership.count({
      where: {
        teamId: organizationId,
        accepted: true,
        OR: [{ customRoleId: DEFAULT_ROLE_IDS[MembershipRole.OWNER] }, { role: MembershipRole.OWNER }],
      },
    });

    // If this is the last owner, prevent the role change
    if (ownerCount <= 1) {
      throw new RoleManagementError(
        "Cannot change the role of the last owner in the organization",
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
    await this.validateNotLastOwner(organizationId, membershipId, role);

    // Check if role is one of the default MembershipRole enum values
    const isDefaultRole = role in DEFAULT_ROLE_IDS;

    // Also check if the role is a default role ID value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
