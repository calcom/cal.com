import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";

import kysely from "@calcom/kysely";

import type { PermissionString } from "../types/permission-registry";

type DbPermission = {
  resource: string | null;
  action: string | null;
};

type DbRole = {
  id: string | null;
  permissions: DbPermission[];
};

type DbMembership = {
  teamId: number;
  role: DbRole | null;
};

export class PermissionRepository {
  async getMembershipByMembershipId(membershipId: number) {
    return kysely
      .selectFrom("Membership")
      .leftJoin("Team", "Team.id", "Membership.teamId")
      .select([
        "Membership.id",
        "Membership.teamId",
        "Membership.userId",
        "Membership.customRoleId",
        "Team.parentId as team_parentId",
      ])
      .where("Membership.id", "=", membershipId)
      .executeTakeFirst();
  }

  async getMembershipByUserAndTeam(userId: number, teamId: number) {
    return kysely
      .selectFrom("Membership")
      .leftJoin("Team", "Team.id", "Membership.teamId")
      .select([
        "Membership.id",
        "Membership.teamId",
        "Membership.userId",
        "Membership.customRoleId",
        "Team.parentId as team_parentId",
      ])
      .where("Membership.userId", "=", userId)
      .where("Membership.teamId", "=", teamId)
      .executeTakeFirst();
  }

  async getOrgMembership(userId: number, parentId: number) {
    return kysely
      .selectFrom("Membership")
      .select(["Membership.id", "Membership.teamId", "Membership.userId", "Membership.customRoleId"])
      .where("Membership.userId", "=", userId)
      .where("Membership.teamId", "=", parentId)
      .executeTakeFirst();
  }

  async getUserMemberships(userId: number): Promise<DbMembership[]> {
    return kysely
      .selectFrom("Membership")
      .leftJoin("Role", "Role.id", "Membership.customRoleId")
      .leftJoin("RolePermission", "RolePermission.roleId", "Role.id")
      .select((eb) => [
        "Membership.teamId",
        jsonObjectFrom(
          eb
            .selectFrom("Role")
            .select((eb) => [
              "Role.id",
              jsonArrayFrom(
                eb
                  .selectFrom("RolePermission")
                  .select(["RolePermission.resource", "RolePermission.action"])
                  .whereRef("RolePermission.roleId", "=", "Role.id")
              ).as("permissions"),
            ])
            .whereRef("Role.id", "=", "Membership.customRoleId")
        ).as("role"),
      ])
      .where("Membership.userId", "=", userId)
      .distinctOn(["Membership.teamId"])
      .execute();
  }

  async checkRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const [resource, action] = permission.split(".");
    const hasPermission = await kysely
      .selectFrom("RolePermission")
      .select("id")
      .where("roleId", "=", roleId)
      .where((eb) =>
        eb.or([
          // Global wildcard
          eb.and([eb("resource", "=", "*"), eb("action", "=", "*")]),
          // Resource wildcard
          eb.and([eb("resource", "=", "*"), eb("action", "=", action)]),
          // Action wildcard
          eb.and([eb("resource", "=", resource), eb("action", "=", "*")]),
          // Exact match
          eb.and([eb("resource", "=", resource), eb("action", "=", action)]),
        ])
      )
      .executeTakeFirst();
    return !!hasPermission;
  }

  async checkRolePermissions(roleId: string, permissions: PermissionString[]): Promise<boolean> {
    const permissionPairs = permissions.map((p) => {
      const [resource, action] = p.split(".");
      return { resource, action };
    });

    const matchingPermissionsCount = await kysely
      .selectFrom("RolePermission")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("roleId", "=", roleId)
      .where((eb) =>
        eb.or([
          // Global wildcard
          eb.and([eb("resource", "=", "*"), eb("action", "=", "*")]),
          // Resource wildcards
          eb.and([
            eb("resource", "=", "*"),
            eb(
              "action",
              "in",
              permissionPairs.map((p) => p.action)
            ),
          ]),
          // Action wildcards
          eb.and([
            eb(
              "resource",
              "in",
              permissionPairs.map((p) => p.resource)
            ),
            eb("action", "=", "*"),
          ]),
          // Exact matches
          eb.or(
            permissionPairs.map((p) => eb.and([eb("resource", "=", p.resource), eb("action", "=", p.action)]))
          ),
        ])
      )
      .executeTakeFirstOrThrow();

    return Number(matchingPermissionsCount.count) >= permissions.length;
  }
}
