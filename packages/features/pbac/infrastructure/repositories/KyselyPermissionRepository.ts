import type { Kysely } from "kysely";
import { sql } from "kysely";

import logger from "@calcom/lib/logger";
import type { KyselyDatabase } from "@calcom/kysely/types";
import type { MembershipRole } from "@calcom/prisma/enums";

import { PermissionMapper } from "../../domain/mappers/PermissionMapper";
import type { TeamPermissions } from "../../domain/models/Permission";
import type { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import type { CrudAction, CustomAction } from "../../domain/types/permission-registry";
import {
  Resource,
  type PermissionString,
  parsePermissionString,
} from "../../domain/types/permission-registry";

export class KyselyPermissionRepository implements IPermissionRepository {
  private readonly PBAC_FEATURE_FLAG = "pbac" as const;
  private readonly logger = logger.getSubLogger({ prefix: ["PermissionRepository"] });

  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async getUserMemberships(userId: number): Promise<TeamPermissions[]> {
    const memberships = await this.dbRead
      .selectFrom("Membership")
      .leftJoin("Role", "Membership.customRoleId", "Role.id")
      .select([
        "Membership.teamId",
        "Membership.customRoleId",
        "Role.id as roleId",
      ])
      .where("Membership.userId", "=", userId)
      .execute();

    const membershipsWithPermissions = await Promise.all(
      memberships.map(async (membership) => {
        let permissions: Array<{ id: string; roleId: string; resource: string; action: string }> = [];
        if (membership.customRoleId) {
          permissions = await this.dbRead
            .selectFrom("RolePermission")
            .selectAll()
            .where("roleId", "=", membership.customRoleId)
            .execute();
        }

        return {
          teamId: membership.teamId,
          role: membership.customRoleId
            ? {
                id: membership.customRoleId,
                permissions,
              }
            : null,
        };
      })
    );

    return PermissionMapper.toDomain(membershipsWithPermissions);
  }

  async getMembershipByMembershipId(membershipId: number) {
    const membership = await this.dbRead
      .selectFrom("Membership")
      .leftJoin("Team", "Membership.teamId", "Team.id")
      .select([
        "Membership.id",
        "Membership.teamId",
        "Membership.userId",
        "Membership.customRoleId",
        "Team.parentId",
      ])
      .where("Membership.id", "=", membershipId)
      .executeTakeFirst();

    if (!membership) return null;

    return {
      id: membership.id,
      teamId: membership.teamId,
      userId: membership.userId,
      customRoleId: membership.customRoleId,
      team: {
        parentId: membership.parentId,
      },
    };
  }

  async getMembershipByUserAndTeam(userId: number, teamId: number) {
    const membership = await this.dbRead
      .selectFrom("Membership")
      .leftJoin("Team", "Membership.teamId", "Team.id")
      .select([
        "Membership.id",
        "Membership.teamId",
        "Membership.userId",
        "Membership.customRoleId",
        "Team.parentId",
      ])
      .where("Membership.userId", "=", userId)
      .where("Membership.teamId", "=", teamId)
      .executeTakeFirst();

    if (!membership) return null;

    return {
      id: membership.id,
      teamId: membership.teamId,
      userId: membership.userId,
      customRoleId: membership.customRoleId,
      team: {
        parentId: membership.parentId,
      },
    };
  }

  async getOrgMembership(userId: number, orgId: number) {
    const membership = await this.dbRead
      .selectFrom("Membership")
      .select(["id", "teamId", "userId", "customRoleId"])
      .where("userId", "=", userId)
      .where("teamId", "=", orgId)
      .executeTakeFirst();

    return membership ?? null;
  }

  async getTeamById(teamId: number) {
    const team = await this.dbRead
      .selectFrom("Team")
      .select(["id", "parentId"])
      .where("id", "=", teamId)
      .executeTakeFirst();

    return team ?? null;
  }

  async checkRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const { resource, action } = parsePermissionString(permission);
    const hasPermission = await this.dbRead
      .selectFrom("RolePermission")
      .select(["id"])
      .where("roleId", "=", roleId)
      .where((eb) =>
        eb.or([
          eb.and([eb("resource", "=", "*"), eb("action", "=", "*")]),
          eb.and([eb("resource", "=", "*"), eb("action", "=", action)]),
          eb.and([eb("resource", "=", resource), eb("action", "=", "*")]),
          eb.and([eb("resource", "=", resource), eb("action", "=", action)]),
        ])
      )
      .executeTakeFirst();

    return !!hasPermission;
  }

  async checkRolePermissions(roleId: string, permissions: PermissionString[]): Promise<boolean> {
    if (permissions.length === 0) {
      return false;
    }

    const permissionPairs = permissions.map((p) => {
      const { resource, action } = parsePermissionString(p);
      return { resource, action };
    });

    const permissionPairsJson = JSON.stringify(permissionPairs);

    const result = await sql<{ count: string }>`
      SELECT COUNT(*) as count
      FROM jsonb_array_elements(${permissionPairsJson}::jsonb) AS required_perm
      WHERE EXISTS (
        SELECT 1
        FROM "RolePermission" rp
        WHERE rp."roleId" = ${roleId}
          AND (
            -- Universal permission (*,*)
            (rp."resource" = '*' AND rp."action" = '*') OR
            -- Wildcard resource with specific action
            (rp."resource" = '*' AND rp."action" = required_perm->>'action') OR
            -- Specific resource with wildcard action
            (rp."resource" = required_perm->>'resource' AND rp."action" = '*') OR
            -- Exact resource-action pair
            (rp."resource" = required_perm->>'resource' AND rp."action" = required_perm->>'action')
          )
      )
    `.execute(this.dbRead);

    return Number(result.rows[0]?.count ?? 0) >= permissions.length;
  }

  async getResourcePermissions(
    userId: number,
    teamId: number,
    resource: Resource
  ): Promise<(CrudAction | CustomAction)[]> {
    const membership = await this.dbRead
      .selectFrom("Membership")
      .select(["customRoleId"])
      .where("userId", "=", userId)
      .where("teamId", "=", teamId)
      .executeTakeFirst();

    if (!membership?.customRoleId) return [];

    const teamPermissions = await this.dbRead
      .selectFrom("RolePermission")
      .select(["action", "resource"])
      .where("roleId", "=", membership.customRoleId)
      .where((eb) => eb.or([eb("resource", "=", resource), eb("resource", "=", Resource.All)]))
      .execute();

    return teamPermissions.map((p) => p.action as CrudAction | CustomAction);
  }

  async getResourcePermissionsByRoleId(
    roleId: string,
    resource: Resource
  ): Promise<(CrudAction | CustomAction)[]> {
    const permissions = await this.dbRead
      .selectFrom("RolePermission")
      .select(["action", "resource"])
      .where("roleId", "=", roleId)
      .where((eb) => eb.or([eb("resource", "=", resource), eb("resource", "=", Resource.All)]))
      .execute();

    return permissions.map((p) => p.action as CrudAction | CustomAction);
  }

  async getTeamIdsWithPermission({
    userId,
    permission,
    fallbackRoles,
  }: {
    userId: number;
    permission: PermissionString;
    fallbackRoles: MembershipRole[];
  }): Promise<number[]> {
    return this.getTeamIdsWithPermissions({ userId, permissions: [permission], fallbackRoles });
  }

  async getTeamIdsWithPermissions({
    userId,
    permissions,
    fallbackRoles,
  }: {
    userId: number;
    permissions: PermissionString[];
    fallbackRoles: MembershipRole[];
  }): Promise<number[]> {
    if (permissions.length === 0) {
      return [];
    }

    const permissionPairs = permissions.map((p) => {
      const { resource, action } = parsePermissionString(p);
      return { resource, action };
    });

    const permissionPairsJson = JSON.stringify(permissionPairs);
    const permissionsLength = permissions.length;
    const pbacFeatureFlag = this.PBAC_FEATURE_FLAG;

    // Teams with PBAC permissions (direct memberships + child teams via org membership)
    const teamsWithPermissionResult = await sql<{ teamId: number }>`
      WITH required_permissions AS (
        SELECT 
          required_perm->>'resource' as resource,
          required_perm->>'action' as action
        FROM jsonb_array_elements(${permissionPairsJson}::jsonb) AS required_perm
      )
      SELECT DISTINCT m."teamId"
      FROM "Membership" m
      INNER JOIN "Role" r ON m."customRoleId" = r.id
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."customRoleId" IS NOT NULL
        AND (
          SELECT COUNT(*)
          FROM required_permissions rp_req
          WHERE EXISTS (
            SELECT 1
            FROM "RolePermission" rp
            WHERE rp."roleId" = r.id
              AND (
                (rp."resource" = '*' AND rp."action" = '*') OR
                (rp."resource" = '*' AND rp."action" = rp_req.action) OR
                (rp."resource" = rp_req.resource AND rp."action" = '*') OR
                (rp."resource" = rp_req.resource AND rp."action" = rp_req.action)
              )
          )
        ) = ${permissionsLength}
      UNION
      SELECT DISTINCT child."id"
      FROM "Membership" m
      INNER JOIN "Role" r ON m."customRoleId" = r.id
      INNER JOIN "Team" org ON m."teamId" = org.id
      INNER JOIN "Team" child ON child."parentId" = org.id
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."customRoleId" IS NOT NULL
        AND (
          SELECT COUNT(*)
          FROM required_permissions rp_req
          WHERE EXISTS (
            SELECT 1
            FROM "RolePermission" rp
            WHERE rp."roleId" = r.id
              AND (
                (rp."resource" = '*' AND rp."action" = '*') OR
                (rp."resource" = '*' AND rp."action" = rp_req.action) OR
                (rp."resource" = rp_req.resource AND rp."action" = '*') OR
                (rp."resource" = rp_req.resource AND rp."action" = rp_req.action)
              )
          )
        ) = ${permissionsLength}
    `.execute(this.dbRead);

    // Teams with fallback roles (direct memberships + child teams via org membership, PBAC disabled)
    const teamsWithFallbackRolesResult = await sql<{ teamId: number }>`
      SELECT DISTINCT m."teamId"
      FROM "Membership" m
      INNER JOIN "Team" t ON m."teamId" = t.id
      LEFT JOIN "TeamFeatures" f ON f."teamId" = t.id AND f."featureId" = ${pbacFeatureFlag}
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."role"::text = ANY(${fallbackRoles}::text[])
        AND f."teamId" IS NULL
      UNION
      SELECT DISTINCT child."id"
      FROM "Membership" m
      INNER JOIN "Team" org ON m."teamId" = org.id
      INNER JOIN "Team" child ON child."parentId" = org.id
      LEFT JOIN "TeamFeatures" f ON f."teamId" = org.id AND f."featureId" = ${pbacFeatureFlag}
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."role"::text = ANY(${fallbackRoles}::text[])
        AND f."teamId" IS NULL
    `.execute(this.dbRead);

    const pbacTeamIds = teamsWithPermissionResult.rows.map((team) => team.teamId);
    const fallbackTeamIds = teamsWithFallbackRolesResult.rows.map((team) => team.teamId);

    const allTeamIds = Array.from(new Set([...pbacTeamIds, ...fallbackTeamIds]));
    return allTeamIds;
  }
}
