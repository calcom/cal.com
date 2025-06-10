import type { Transaction } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { v4 as uuidv4 } from "uuid";

import type { DB } from "@calcom/kysely";
import kysely from "@calcom/kysely";
import { RoleType } from "@calcom/prisma/enums";

import { RoleMapper } from "../../domain/mappers/RoleMapper";
import type { CreateRoleData } from "../../domain/models/Role";
import type { IRoleRepository } from "../../domain/repositories/IRoleRepository";
import type { PermissionString } from "../../domain/types/permission-registry";

export class RoleRepository implements IRoleRepository {
  async findByName(name: string, teamId?: number) {
    const role = await kysely
      .selectFrom("Role")
      .select([
        "Role.id",
        "Role.name",
        "Role.description",
        "Role.teamId",
        "Role.type",
        "Role.color",
        "Role.createdAt",
        "Role.updatedAt",
        (eb) =>
          jsonArrayFrom(
            eb
              .selectFrom("RolePermission")
              .select(["id", "resource", "action"])
              .whereRef("RolePermission.roleId", "=", "Role.id")
          ).as("permissions"),
      ])
      .where("name", "=", name)
      .where((eb) => (teamId ? eb("teamId", "=", teamId) : eb("teamId", "is", null)))
      .executeTakeFirst();

    return role ? RoleMapper.toDomain(role) : null;
  }

  async findById(id: string) {
    const role = await kysely
      .selectFrom("Role")
      .select([
        "Role.id",
        "Role.name",
        "Role.description",
        "Role.teamId",
        "Role.type",
        "Role.color",
        "Role.createdAt",
        "Role.updatedAt",
        (eb) =>
          jsonArrayFrom(
            eb
              .selectFrom("RolePermission")
              .select(["id", "resource", "action"])
              .whereRef("RolePermission.roleId", "=", "Role.id")
          ).as("permissions"),
      ])
      .where("id", "=", id)
      .executeTakeFirst();

    return role ? RoleMapper.toDomain(role) : null;
  }

  async findByTeamId(teamId: number) {
    const roles = await kysely
      .selectFrom("Role")
      .select([
        "Role.id",
        "Role.name",
        "Role.description",
        "Role.teamId",
        "Role.type",
        "Role.color",
        "Role.createdAt",
        "Role.updatedAt",
        (eb) =>
          jsonArrayFrom(
            eb
              .selectFrom("RolePermission")
              .select(["id", "resource", "action"])
              .whereRef("RolePermission.roleId", "=", "Role.id")
          ).as("permissions"),
      ])
      .where((eb) => eb.or([eb("Role.teamId", "=", teamId), eb("Role.type", "=", RoleType.SYSTEM)]))
      .execute();

    return roles.map(RoleMapper.toDomain);
  }

  async create(data: CreateRoleData) {
    const roleId = uuidv4();

    return await kysely.transaction().execute(async (trx) => {
      console.log("data", data);
      // Create role
      const role = await trx
        .insertInto("Role")
        .values({
          id: roleId,
          name: data.name,
          description: data.description || null,
          teamId: data.teamId || null,
          type: data.type || RoleType.CUSTOM,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(["id", "name", "description", "teamId", "type", "createdAt", "updatedAt"])
        .executeTakeFirstOrThrow();

      // Create permissions
      const permissionData = data.permissions.map((permission) => {
        const [resource, action] = permission.split(".");
        return {
          id: uuidv4(),
          roleId,
          resource,
          action,
        };
      });

      console.log("permissionData", permissionData);

      await trx.insertInto("RolePermission").values(permissionData).execute();

      // Fetch complete role with permissions
      const completeRole = await this.findById(roleId);
      if (!completeRole) throw new Error("Failed to create role");

      return completeRole;
    });
  }

  async delete(id: string) {
    await kysely.transaction().execute(async (trx) => {
      await trx.deleteFrom("RolePermission").where("roleId", "=", id).execute();
      await trx.deleteFrom("Role").where("id", "=", id).execute();
    });
  }

  async updatePermissions(roleId: string, permissions: PermissionString[]) {
    return await kysely.transaction().execute(async (trx) => {
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

      // Fetch updated role
      const updatedRole = await this.findById(roleId);
      if (!updatedRole) throw new Error("Failed to update role permissions");

      return updatedRole;
    });
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
