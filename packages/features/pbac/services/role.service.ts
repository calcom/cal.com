import kysely from "@calcom/kysely";
import type { MembershipRole } from "@calcom/prisma/enums";

import { RoleType as DomainRoleType } from "../domain/models/Role";
import type { CreateRoleData, UpdateRolePermissionsData } from "../domain/models/Role";
import type { IRoleRepository } from "../domain/repositories/IRoleRepository";
import { KyselyRoleRepository } from "../infrastructure/repositories/RoleRepository";
import { DEFAULT_ROLE_IDS } from "../lib/constants";
import { PermissionService } from "./permission.service";

// These IDs must match the ones in the migration

export class RoleService {
  constructor(
    private readonly repository: IRoleRepository = new KyselyRoleRepository(),
    private readonly permissionService: PermissionService = new PermissionService()
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
    return this.repository.transaction(async (repo, trx) => {
      const role = await trx.selectFrom("Role").select("id").where("id", "=", roleId).executeTakeFirst();
      if (!role) throw new Error("Role not found");

      // TODO: Move this to a MembershipRepository - bit difficult due to the trx record here.
      await trx
        .updateTable("Membership")
        .set({ customRoleId: roleId })
        .where("id", "=", membershipId)
        .execute();

      return role;
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

    return this.repository.update(data.roleId, data.permissions, {
      color: data.updates?.color,
      name: data.updates?.name,
    });
  }

  async roleBelongsToTeam(roleId: string, teamId: number) {
    return this.repository.roleBelongsToTeam(roleId, teamId);
  }
}
