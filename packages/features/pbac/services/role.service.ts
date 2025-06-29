import { MembershipRole, RoleType } from "@calcom/prisma/enums";

import { RoleRepository } from "../repository/role.repository";
import type { PermissionString } from "../types/permission-registry";
import { PermissionService } from "./permission.service";

// These IDs must match the ones in the migration
const DEFAULT_ROLE_IDS = {
  [MembershipRole.OWNER]: "owner_role",
  [MembershipRole.ADMIN]: "admin_role",
  [MembershipRole.MEMBER]: "member_role",
} as const;

export class RoleService {
  private repository: RoleRepository;
  private permissionService: PermissionService;

  constructor() {
    this.repository = new RoleRepository();
    this.permissionService = new PermissionService();
  }

  async createRole(data: {
    name: string;
    description?: string;
    teamId?: number;
    permissions: PermissionString[];
  }) {
    // Check if role name conflicts with default roles
    const existingRole = await this.repository.findRoleByName(data.name, data.teamId);
    if (existingRole) {
      throw new Error(`Role with name "${data.name}" already exists`);
    }

    // Validate permissions
    if (!this.permissionService.validatePermissions(data.permissions)) {
      throw new Error("Invalid permissions provided");
    }

    return this.repository.transaction(async (trx) => {
      // Create role
      const role = await this.repository.createRole({
        name: data.name,
        description: data.description,
        teamId: data.teamId,
        type: RoleType.CUSTOM,
      });

      // Create permissions
      const permissions = await this.repository.createRolePermissions(role.id, data.permissions);

      return { ...role, permissions };
    });
  }

  async getDefaultRoleId(role: MembershipRole): Promise<string> {
    return DEFAULT_ROLE_IDS[role];
  }

  async assignRoleToMember(roleId: string, membershipId: number) {
    return this.repository.updateMembershipRole(membershipId, roleId);
  }

  async getRolePermissions(roleId: string) {
    const role = await this.repository.findRoleWithPermissions(roleId);
    return role?.permissions ?? [];
  }

  async removeRoleFromMember(membershipId: number) {
    return this.repository.updateMembershipRole(membershipId, null);
  }

  async changeUserRole(membershipId: number, roleId: string) {
    // Verify role exists first
    const role = await this.getRole(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    return this.repository.updateMembershipRole(membershipId, roleId);
  }

  async deleteRole(roleId: string) {
    const role = await this.repository.findRoleWithPermissions(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Don't allow deleting default roles
    if (role.type === RoleType.SYSTEM) {
      throw new Error("Cannot delete default roles");
    }

    return this.repository.transaction(async (trx) => {
      // Delete permissions first
      await this.repository.deleteRolePermissions(roleId);
      // Then delete the role
      return this.repository.deleteRole(roleId);
    });
  }

  async getRole(roleId: string) {
    return this.repository.findRoleWithPermissions(roleId);
  }

  async getTeamRoles(teamId: number) {
    return this.repository.findTeamRoles(teamId);
  }

  async updateRolePermissions(roleId: string, permissions: PermissionString[]) {
    const role = await this.getRole(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Don't allow updating default roles
    if (role.type === RoleType.SYSTEM) {
      throw new Error("Cannot update default roles");
    }

    // Validate permissions
    if (!this.permissionService.validatePermissions(permissions)) {
      throw new Error("Invalid permissions provided");
    }

    return this.repository.transaction(async (trx) => {
      // Delete existing permissions
      await this.repository.deleteRolePermissions(roleId);
      // Create new permissions
      const newPermissions = await this.repository.createRolePermissions(roleId, permissions);
      return { ...role, permissions: newPermissions };
    });
  }
}
