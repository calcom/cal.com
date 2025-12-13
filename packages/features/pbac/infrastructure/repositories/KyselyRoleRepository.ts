import type { Kysely } from "kysely";
import { v4 as uuidv4 } from "uuid";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { Role, RolePermission, PermissionChange, CreateRoleData } from "../../domain/models/Role";
import { RoleType } from "../../domain/models/Role";
import { parsePermissionString } from "../../domain/types/permission-registry";
import { RoleOutputMapper } from "../mappers/RoleOutputMapper";

export class KyselyRoleRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findByName(name: string, teamId?: number): Promise<Role | null> {
    const role = await this.dbRead
      .selectFrom("Role")
      .selectAll()
      .where("name", "=", name)
      .where("teamId", teamId ? "=" : "is", teamId ?? null)
      .executeTakeFirst();

    if (!role) return null;

    const permissions = await this.dbRead
      .selectFrom("RolePermission")
      .selectAll()
      .where("roleId", "=", role.id)
      .execute();

    return RoleOutputMapper.toDomain({ ...role, permissions });
  }

  async findByTeamId(teamId: number): Promise<Role[]> {
    const roles = await this.dbRead
      .selectFrom("Role")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb("teamId", "=", teamId),
          eb.and([eb("teamId", "is", null), eb("type", "=", "SYSTEM")]),
        ])
      )
      .execute();

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await this.dbRead
          .selectFrom("RolePermission")
          .selectAll()
          .where("roleId", "=", role.id)
          .execute();
        return { ...role, permissions };
      })
    );

    return RoleOutputMapper.toDomainList(rolesWithPermissions);
  }

  async roleBelongsToTeam(roleId: string, teamId: number): Promise<boolean> {
    const role = await this.dbRead
      .selectFrom("Role")
      .select(["teamId"])
      .where("id", "=", roleId)
      .executeTakeFirst();

    return role?.teamId === teamId;
  }

  async create(data: CreateRoleData): Promise<Role> {
    const roleId = uuidv4();

    await this.dbWrite
      .insertInto("Role")
      .values({
        id: roleId,
        name: data.name,
        color: data.color ?? null,
        description: data.description ?? null,
        teamId: data.teamId ?? null,
        type: data.type ?? RoleType.CUSTOM,
      })
      .execute();

    if (data.permissions.length > 0) {
      const permissionData = data.permissions.map((permission) => {
        const { resource, action } = parsePermissionString(permission);
        return {
          id: uuidv4(),
          roleId,
          resource,
          action,
        };
      });

      await this.dbWrite.insertInto("RolePermission").values(permissionData).execute();
    }

    const completeRole = await this.findById(roleId);
    if (!completeRole) throw new Error("Failed to create role");

    return completeRole;
  }

  async delete(id: string): Promise<void> {
    await this.dbWrite.deleteFrom("RolePermission").where("roleId", "=", id).execute();

    await this.dbWrite.deleteFrom("Role").where("id", "=", id).execute();
  }

  async reassignUsersToRole(fromRoleId: string, toRoleId: string): Promise<void> {
    await this.dbWrite
      .updateTable("Membership")
      .set({ customRoleId: toRoleId })
      .where("customRoleId", "=", fromRoleId)
      .execute();
  }

  async update(
    roleId: string,
    permissionChanges: {
      toAdd: PermissionChange[];
      toRemove: PermissionChange[];
    },
    updates?: {
      color?: string;
      name?: string;
      description?: string;
    }
  ) {
    // Update role metadata if provided
    if (updates) {
      const updateData: Record<string, string | null> = {};
      if (updates.color !== undefined) updateData.color = updates.color || null;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;

      if (Object.keys(updateData).length > 0) {
        await this.dbWrite.updateTable("Role").set(updateData).where("id", "=", roleId).execute();
      }
    }

    // Remove permissions that are no longer needed
    if (permissionChanges.toRemove.length > 0) {
      for (const p of permissionChanges.toRemove) {
        await this.dbWrite
          .deleteFrom("RolePermission")
          .where("roleId", "=", roleId)
          .where("resource", "=", p.resource)
          .where("action", "=", p.action)
          .execute();
      }
    }

    // Add new permissions
    if (permissionChanges.toAdd.length > 0) {
      const permissionData = permissionChanges.toAdd.map((permission) => ({
        id: uuidv4(),
        roleId,
        resource: permission.resource,
        action: permission.action,
      }));

      await this.dbWrite.insertInto("RolePermission").values(permissionData).execute();
    }

    // Fetch complete role with permissions
    const completeRole = await this.findById(roleId);
    if (!completeRole) throw new Error("Failed to update role");
    return completeRole;
  }

  async findById(roleId: string): Promise<Role | null> {
    const role = await this.dbRead
      .selectFrom("Role")
      .selectAll()
      .where("id", "=", roleId)
      .executeTakeFirst();

    if (!role) return null;

    const permissions = await this.dbRead
      .selectFrom("RolePermission")
      .selectAll()
      .where("roleId", "=", roleId)
      .execute();

    return RoleOutputMapper.toDomain({ ...role, permissions });
  }

  async getPermissions(roleId: string): Promise<RolePermission[]> {
    const permissions = await this.dbRead
      .selectFrom("RolePermission")
      .selectAll()
      .where("roleId", "=", roleId)
      .execute();

    return permissions.map(RoleOutputMapper.toDomainPermission);
  }
}
