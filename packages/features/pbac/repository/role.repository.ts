import type { ExpressionBuilder } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";

import kysely from "@calcom/kysely";
import type { DB } from "@calcom/kysely/types";
import prisma from "@calcom/prisma";
import { RoleType } from "@calcom/prisma/enums";

import type { PermissionString, Resource, CrudAction, CustomAction } from "../types/permission-registry";

export class RoleRepository {
  async findRoleByName(name: string, teamId?: number) {
    return kysely
      .selectFrom("Role")
      .selectAll()
      .where("name", "=", name)
      .where((eb) => (teamId ? eb("teamId", "=", teamId) : eb("teamId", "is", null)))
      .executeTakeFirst();
  }

  async createRole(data: { name: string; description?: string; teamId?: number; type: RoleType }) {
    return prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        teamId: data.teamId,
        type: data.type,
      },
    });
  }

  async createRolePermissions(roleId: string, permissions: PermissionString[]) {
    return prisma.rolePermission.createMany({
      data: permissions.map((permission) => {
        const [resource, action] = permission.split(".") as [Resource, CrudAction | CustomAction];
        return { roleId, resource, action };
      }),
    });
  }

  async findRoleWithPermissions(roleId: string) {
    const role = await kysely
      .selectFrom("Role")
      .leftJoin("RolePermission", "RolePermission.roleId", "Role.id")
      .select([
        "Role.id",
        "Role.name",
        "Role.description",
        "Role.teamId",
        "Role.type",
        "Role.createdAt",
        "Role.updatedAt",
        (eb: ExpressionBuilder<DB, "Role" | "RolePermission">) =>
          jsonArrayFrom(
            eb
              .selectFrom("RolePermission")
              .select(["resource", "action", "id"])
              .whereRef("RolePermission.roleId", "=", "Role.id")
          ).as("permissions"),
      ])
      .where("Role.id", "=", roleId)
      .executeTakeFirst();

    return role;
  }

  async findTeamRoles(teamId: number) {
    return kysely
      .selectFrom("Role")
      .leftJoin("RolePermission", "RolePermission.roleId", "Role.id")
      .select([
        "Role.id",
        "Role.name",
        "Role.description",
        "Role.teamId",
        "Role.type",
        "Role.createdAt",
        "Role.updatedAt",
        (eb: ExpressionBuilder<DB, "Role" | "RolePermission">) =>
          jsonArrayFrom(
            eb
              .selectFrom("RolePermission")
              .select(["resource", "action", "id"])
              .whereRef("RolePermission.roleId", "=", "Role.id")
          ).as("permissions"),
      ])
      .where((eb: ExpressionBuilder<DB, "Role" | "RolePermission">) =>
        eb.or([eb("Role.teamId", "=", teamId), eb("Role.type", "=", RoleType.SYSTEM)])
      )
      .execute();
  }

  async deleteRolePermissions(roleId: string) {
    return kysely.deleteFrom("RolePermission").where("roleId", "=", roleId).execute();
  }

  async deleteRole(roleId: string) {
    return kysely.deleteFrom("Role").where("id", "=", roleId).returningAll().executeTakeFirst();
  }

  async updateMembershipRole(membershipId: number, roleId: string | null) {
    return kysely
      .updateTable("Membership")
      .set({ customRoleId: roleId })
      .where("id", "=", membershipId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async transaction<T>(callback: (trx: typeof kysely) => Promise<T>): Promise<T> {
    return kysely.transaction().execute(callback);
  }
}
