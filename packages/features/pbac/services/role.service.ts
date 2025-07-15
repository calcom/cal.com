import db from "@calcom/prisma";
import type { MembershipRole } from "@calcom/prisma/enums";

import { RoleType as DomainRoleType } from "../domain/models/Role";
import type { CreateRoleData, UpdateRolePermissionsData } from "../domain/models/Role";
import type { IRoleRepository } from "../domain/repositories/IRoleRepository";
import { RoleRepository } from "../infrastructure/repositories/RoleRepository";
import { DEFAULT_ROLE_IDS } from "../lib/constants";
import { PermissionDiffService } from "./permission-diff.service";
import { PermissionService } from "./permission.service";

export class RoleService {
  constructor(
    private readonly repository: IRoleRepository = new RoleRepository(),
    private readonly permissionService: PermissionService = new PermissionService(),
    private readonly permissionDiffService: PermissionDiffService = new PermissionDiffService()
  ) {}

  async createRole(data: CreateRoleData) {
    // Check if role name conflicts with default roles
    const existingRole = await this.repository.findByName(data.name, data.teamId);
    if (existingRole) {
      throw new Error(`Role with name "${data.name}" already exists`);
    }

    // Validate permissions
    const validationResult = this.permissionService.validatePermissions(data.permissions);
    if (!validationResult.isValid) {
      throw new Error(validationResult.error || "Invalid permissions provided");
    }

    return this.repository.create(data);
  }

  async getDefaultRoleId(role: MembershipRole): Promise<string> {
    return DEFAULT_ROLE_IDS[role];
  }

  async assignRoleToMember(roleId: string, membershipId: number) {
    const role = await this.repository.findById(roleId);
    if (!role) throw new Error("Role not found");
    await db.membership.update({
      where: { id: membershipId },
      data: { customRoleId: roleId },
    });
    return role;
  }

  async getRolePermissions(roleId: string) {
    const role = await this.repository.findById(roleId);
    return role?.permissions ?? [];
  }

  async removeRoleFromMember(membershipId: number) {
    await db.membership.update({
      where: { id: membershipId },
      data: { customRoleId: null },
    });
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
    if (role.type === DomainRoleType.SYSTEM) {
      throw new Error("Cannot delete default roles");
    }
    await this.repository.delete(roleId);
  }

  async update(data: UpdateRolePermissionsData) {
    const role = await this.repository.findById(data.roleId);
    if (!role) {
      throw new Error("Role not found");
    }
    // Don't allow updating default roles
    if (role.type === DomainRoleType.SYSTEM) {
      throw new Error("Cannot update default roles");
    }
    // Validate permissions
    const validationResult = this.permissionService.validatePermissions(data.permissions);
    if (!validationResult.isValid) {
      throw new Error(validationResult.error || "Invalid permissions provided");
    }

    const existingPermissions = await this.repository.getPermissions(data.roleId);
    const permissionChanges = this.permissionDiffService.calculateDiff(data.permissions, existingPermissions);

    return this.repository.update(data.roleId, permissionChanges, {
      color: data.updates?.color,
      name: data.updates?.name,
    });
  }

  async roleBelongsToTeam(roleId: string, teamId: number) {
    return this.repository.roleBelongsToTeam(roleId, teamId);
  }
}
