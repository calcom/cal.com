import kysely from "@calcom/kysely";

import { PermissionMapper } from "../../domain/mappers/PermissionMapper";
import type { TeamPermissions } from "../../domain/models/Permission";
import type { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import type { CrudAction, CustomAction } from "../../domain/types/permission-registry";
import { Resource, type PermissionString } from "../../domain/types/permission-registry";

export class PermissionRepository implements IPermissionRepository {
  async getUserMemberships(userId: number): Promise<TeamPermissions[]> {
    const memberships = await kysely
      .selectFrom("Membership")
      .innerJoin("Role", "Role.id", "Membership.customRoleId")
      .leftJoin("RolePermission", "RolePermission.roleId", "Role.id")
      .select(["Membership.teamId", "Role.id as roleId", "RolePermission.resource", "RolePermission.action"])
      .where("Membership.userId", "=", userId)
      .execute();

    // Group permissions by teamId and roleId
    const membershipsWithPermissions = memberships.reduce((acc, membership) => {
      const key = `${membership.teamId}-${membership.roleId}`;
      if (!acc[key]) {
        acc[key] = {
          teamId: membership.teamId,
          role: {
            id: membership.roleId,
            permissions: [],
          },
        };
      }
      if (membership.resource && membership.action) {
        acc[key].role.permissions.push({
          resource: membership.resource,
          action: membership.action,
        });
      }
      return acc;
    }, {} as Record<string, any>);

    return PermissionMapper.toDomain(Object.values(membershipsWithPermissions));
  }

  async getMembershipByMembershipId(membershipId: number) {
    const result = await kysely
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

    if (!result) return null;

    return {
      ...result,
      team_parentId: result.team_parentId || undefined,
    };
  }

  async getMembershipByUserAndTeam(userId: number, teamId: number) {
    const result = await kysely
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

    if (!result) return null;

    return {
      ...result,
      team_parentId: result.team_parentId || undefined,
    };
  }

  async getOrgMembership(userId: number, orgId: number) {
    const result = await kysely
      .selectFrom("Membership")
      .select(["id", "teamId", "userId", "customRoleId"])
      .where("userId", "=", userId)
      .where("teamId", "=", orgId)
      .executeTakeFirst();

    return result || null;
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

  async getResourcePermissions(
    userId: number,
    teamId: number,
    resource: Resource
  ): Promise<(CrudAction | CustomAction)[]> {
    // Get team-level permissions
    const membership = await kysely
      .selectFrom("Membership")
      .select("customRoleId")
      .where("userId", "=", userId)
      .where("teamId", "=", teamId)
      .executeTakeFirst();

    if (!membership?.customRoleId) return [];

    const teamPermissions = await kysely
      .selectFrom("RolePermission")
      .select(["action", "resource"])
      .where("roleId", "=", membership.customRoleId)
      .where((eb) => eb.or([eb("resource", "=", resource), eb("resource", "=", Resource.All)]))
      .execute();

    return teamPermissions.map((p) => p.action as CrudAction | CustomAction);
  }
}
