import { jsonArrayFrom } from "kysely/helpers/postgres";

import kysely from "@calcom/kysely";
import prisma from "@calcom/prisma";
import { RoleType } from "@calcom/prisma/enums";

import type { PermissionString } from "../types/permission-registry";

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
    const permissionData = permissions.map((permission) => {
      const [resource, action] = permission.split(".");
      return {
        roleId,
        resource,
        action,
      };
    });

    return prisma.rolePermission.createMany({
      data: permissionData,
    });
  }

  async findRoleWithPermissions(roleId: string) {
    const role = await kysely
      .selectFrom("Role")
      .select([
        "Role.id",
        "Role.name",
        "Role.description",
        "Role.teamId",
        "Role.type",
        "Role.createdAt",
        "Role.updatedAt",
        (eb) =>
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
    const roles = await kysely
      .selectFrom("Role")
      .select([
        "Role.id",
        "Role.name",
        "Role.description",
        "Role.teamId",
        "Role.type",
        "Role.createdAt",
        "Role.updatedAt",
        (eb) =>
          jsonArrayFrom(
            eb
              .selectFrom("RolePermission")
              .select(["resource", "action", "id"])
              .whereRef("RolePermission.roleId", "=", "Role.id")
          ).as("permissions"),
      ])
      .where((eb) => eb.or([eb("Role.teamId", "=", teamId), eb("Role.type", "=", RoleType.SYSTEM)]))
      .execute();

    return roles;
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

  async transaction<T>(callback: (trx: any) => Promise<T>) {
    return prisma.$transaction(callback);
  }
}
