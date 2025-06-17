import type { Transaction } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { v4 as uuidv4 } from "uuid";

import type { DB } from "@calcom/kysely";
import kysely from "@calcom/kysely";

import { RoleMapper } from "../../domain/mappers/RoleMapper";
import { RoleType } from "../../domain/models/Role";
import type { CreateRoleData } from "../../domain/models/Role";
import type { IRoleRepository } from "../../domain/repositories/IRoleRepository";
import type { PermissionString } from "../../domain/types/permission-registry";

type KyselyRole = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  teamId: number | null;
  type: RoleType;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
  }>;
};

export class RoleRepository implements IRoleRepository {
  private getRoleSelect() {
    return [
      "Role.id",
      "Role.name",
      "Role.description",
      "Role.teamId",
      "Role.type",
      "Role.color",
      "Role.createdAt",
      "Role.updatedAt",
      (eb: any) =>
        jsonArrayFrom(
          eb
            .selectFrom("RolePermission")
            .select(["id", "resource", "action"])
            .whereRef("RolePermission.roleId", "=", "Role.id")
        ).as("permissions"),
    ] as const;
  }

  async findByName(name: string, teamId?: number) {
    const role = await kysely
      .selectFrom("Role")
      .select(this.getRoleSelect())
      .where("name", "=", name)
      .where((eb) => (teamId ? eb("teamId", "=", teamId) : eb("teamId", "is", null)))
      .executeTakeFirst();

    return role ? RoleMapper.toDomain(role as KyselyRole) : null;
  }

  async findById(id: string) {
    const role = await kysely
      .selectFrom("Role")
      .select(this.getRoleSelect())
      .where("id", "=", id)
      .executeTakeFirst();

    return role ? RoleMapper.toDomain(role as KyselyRole) : null;
  }

  async findByTeamId(teamId: number) {
    const roles = await kysely
      .selectFrom("Role")
      .select(this.getRoleSelect())
      .where((eb) => eb.or([eb("Role.teamId", "=", teamId), eb("Role.type", "=", RoleType.SYSTEM)]))
      .execute();

    return roles.map((role) => RoleMapper.toDomain(role as KyselyRole));
  }

  async create(data: CreateRoleData) {
    const roleId = uuidv4();

    await kysely.transaction().execute(async (trx) => {
      // Create role
      await trx
        .insertInto("Role")
        .values({
          id: roleId,
          name: data.name,
          description: data.description || null,
          teamId: data.teamId || null,
          type: data.type || RoleType.CUSTOM,
          color: data.color || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();

      // Create permissions only if there are any
      if (data.permissions.length > 0) {
        const permissionData = data.permissions.map((permission) => {
          const [resource, action] = permission.split(".");
          return {
            id: uuidv4(),
            roleId,
            resource,
            action,
          };
        });

        await trx.insertInto("RolePermission").values(permissionData).execute();
      }

      return roleId;
    });

    // Fetch complete role with permissions
    const completeRole = await this.findById(roleId);

    // This should never happen
    if (!completeRole) throw new Error("Failed to create role");

    return completeRole;
  }

  async delete(id: string) {
    await kysely.transaction().execute(async (trx) => {
      await trx.deleteFrom("RolePermission").where("roleId", "=", id).execute();
      await trx.deleteFrom("Role").where("id", "=", id).execute();
    });
  }

  async update(
    roleId: string,
    permissions: PermissionString[],
    updates?: {
      color?: string;
      name?: string;
      description?: string;
    }
  ) {
    await kysely.transaction().execute(async (trx) => {
      // Update role metadata if provided
      if (updates) {
        const updateData: Partial<Pick<KyselyRole, "name" | "color" | "description">> = {};

        if (updates.color !== undefined) {
          updateData.color = updates.color || null;
        }
        if (updates.name !== undefined) {
          updateData.name = updates.name;
        }
        if (updates.description !== undefined) {
          updateData.description = updates.description || null;
        }

        await trx.updateTable("Role").set(updateData).where("id", "=", roleId).execute();
      }

      // Delete existing permissions
      await trx.deleteFrom("RolePermission").where("roleId", "=", roleId).execute();

      // Create new permissions
      const permissionData = permissions.map((permission) => {
        const [resource, action] = permission.split(".");
        return {
          id: uuidv4(),
          roleId,
          resource,
          action,
        };
      });

      await trx.insertInto("RolePermission").values(permissionData).execute();

      return roleId;
    });

    // Fetch updated role
    const updatedRole = await kysely
      .selectFrom("Role")
      .select(this.getRoleSelect())
      .where("id", "=", roleId)
      .executeTakeFirst();

    if (!updatedRole) throw new Error("Failed to update role permissions");

    return RoleMapper.toDomain(updatedRole as KyselyRole);
  }

  async transaction<T>(
    callback: (repository: IRoleRepository, trx: Transaction<DB>) => Promise<T>
  ): Promise<T> {
    return kysely.transaction().execute(async (trx) => {
      // Create a new repository instance with the transaction connection
      const transactionRepo = new RoleRepository();
      // Pass both the repository and the transaction connection
      return callback(transactionRepo, trx);
    });
  }

  async roleBelongsToTeam(roleId: string, teamId: number) {
    const role = await this.findById(roleId);
    return role?.teamId === teamId;
  }
}
