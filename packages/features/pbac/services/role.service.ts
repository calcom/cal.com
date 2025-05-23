import kysely from "@calcom/kysely";
import { MembershipRole, RoleType } from "@calcom/prisma/enums";

import type { CreateRoleData, UpdateRolePermissionsData } from "../domain/models/Role";
import type { IRoleRepository } from "../domain/repositories/IRoleRepository";
import { RoleRepository } from "../infrastructure/repositories/RoleRepository";
import { PermissionService } from "./permission.service";

// These IDs must match the ones in the migration
const DEFAULT_ROLE_IDS = {
  [MembershipRole.OWNER]: "owner_role",
  [MembershipRole.ADMIN]: "admin_role",
  [MembershipRole.MEMBER]: "member_role",
} as const;

export class RoleService {
  constructor(
    private readonly repository: IRoleRepository = new RoleRepository(),
    private readonly permissionService: PermissionService = new PermissionService()
  ) {}

  async createRole(data: CreateRoleData) {
    // Check if role name conflicts with default roles
    const existingRole = await this.repository.findByName(data.name, data.teamId);
    if (existingRole) {
      throw new Error(`Role with name "${data.name}" already exists`);
    }

    // Validate permissions
    if (!this.permissionService.validatePermissions(data.permissions)) {
      throw new Error("Invalid permissions provided");
    }

    return this.repository.create(data);
  }

  async getDefaultRoleId(role: MembershipRole): Promise<string> {
    return DEFAULT_ROLE_IDS[role];
  }

  async assignRoleToMember(roleId: string, membershipId: number) {
    // This would be handled by a MembershipService in a full DDD implementation
    // For now, we'll keep the existing implementation
    return this.repository.transaction(async (repo) => {
      const role = await repo.findById(roleId);
      if (!role) throw new Error("Role not found");

      // TODO: Move this to a MembershipRepository
      await kysely
        .updateTable("Membership")
        .set({ customRoleId: roleId })
        .where("id", "=", membershipId)
        .execute();
    });
  }

  async getRolePermissions(roleId: string) {
    const role = await this.repository.findById(roleId);
    return role?.permissions ?? [];
  }

  async removeRoleFromMember(membershipId: number) {
    // TODO: Move this to a MembershipRepository
    await kysely
      .updateTable("Membership")
      .set({ customRoleId: null })
      .where("id", "=", membershipId)
      .execute();
  }

  async getRole(roleId: string) {
    return this.repository.findById(roleId);
  }

  async getTeamRoles(teamId: number) {
    return this.repository.findByTeamId(teamId);
  }

  async deleteRole(roleId: string) {
    const role = await this.repository.findById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Don't allow deleting default roles
    if (role.type === RoleType.SYSTEM) {
      throw new Error("Cannot delete default roles");
    }

    await this.repository.delete(roleId);
  }

  async updateRolePermissions(data: UpdateRolePermissionsData) {
    const role = await this.repository.findById(data.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Don't allow updating default roles
    if (role.type === RoleType.SYSTEM) {
      throw new Error("Cannot update default roles");
    }

    // Validate permissions
    if (!this.permissionService.validatePermissions(data.permissions)) {
      throw new Error("Invalid permissions provided");
    }

    return this.repository.updatePermissions(data.roleId, data.permissions);
  }
}
