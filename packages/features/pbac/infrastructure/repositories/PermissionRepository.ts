import db from "@calcom/prisma";
import type { PrismaClient as PrismaClientWithExtensions } from "@calcom/prisma";
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

export class PermissionRepository implements IPermissionRepository {
  private readonly PBAC_FEATURE_FLAG = "pbac" as const;
  private client: PrismaClientWithExtensions;

  constructor(client: PrismaClientWithExtensions = db) {
    this.client = client;
  }

  async getUserMemberships(userId: number): Promise<TeamPermissions[]> {
    const memberships = await this.client.membership.findMany({
      where: { userId },
      include: {
        customRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
    // Map to expected structure for PermissionMapper
    const mapped = memberships.map((membership) => ({
      teamId: membership.teamId,
      role: membership.customRole
        ? {
            id: membership.customRole.id,
            permissions: membership.customRole.permissions,
          }
        : null,
    }));
    return PermissionMapper.toDomain(mapped);
  }

  async getMembershipByMembershipId(membershipId: number) {
    return this.client.membership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        teamId: true,
        userId: true,
        customRoleId: true,
        team: {
          select: {
            parentId: true,
          },
        },
      },
    });
  }

  async getMembershipByUserAndTeam(userId: number, teamId: number) {
    return this.client.membership.findFirst({
      where: {
        userId,
        teamId,
      },
      select: {
        id: true,
        teamId: true,
        userId: true,
        customRoleId: true,
        team: {
          select: {
            parentId: true,
          },
        },
      },
    });
  }

  async getOrgMembership(userId: number, orgId: number) {
    return this.client.membership.findFirst({
      where: {
        userId,
        teamId: orgId,
      },
      select: {
        id: true,
        teamId: true,
        userId: true,
        customRoleId: true,
      },
    });
  }

  async getTeamById(teamId: number) {
    return this.client.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        parentId: true,
      },
    });
  }

  async checkRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const { resource, action } = parsePermissionString(permission);
    const hasPermission = await this.client.rolePermission.findFirst({
      where: {
        roleId,
        OR: [
          { resource: "*", action: "*" },
          { resource: "*", action },
          { resource, action: "*" },
          { resource, action },
        ],
      },
    });
    return !!hasPermission;
  }

  async checkRolePermissions(roleId: string, permissions: PermissionString[]): Promise<boolean> {
    // Validate that permissions array is not empty to prevent privilege escalation
    if (permissions.length === 0) {
      return false;
    }

    const permissionPairs = permissions.map((p) => {
      const { resource, action } = parsePermissionString(p);
      return { resource, action };
    });

    // Convert permission pairs to JSONB for proper serialization
    const permissionPairsJson = JSON.stringify(permissionPairs);

    // Check if each requested permission is satisfied by at least one role permission
    const matchingPermissions = await this.client.$queryRaw<[{ count: bigint }]>`
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
    `;

    return Number(matchingPermissions[0].count) >= permissions.length;
  }

  async getResourcePermissions(
    userId: number,
    teamId: number,
    resource: Resource
  ): Promise<(CrudAction | CustomAction)[]> {
    // Get team-level permissions
    const membership = await this.client.membership.findFirst({
      where: {
        userId,
        teamId,
      },
      select: {
        customRoleId: true,
      },
    });
    if (!membership?.customRoleId) return [];
    const teamPermissions = await this.client.rolePermission.findMany({
      where: {
        roleId: membership.customRoleId,
        OR: [{ resource }, { resource: Resource.All }],
      },
      select: {
        action: true,
        resource: true,
      },
    });
    return teamPermissions.map((p) => p.action as CrudAction | CustomAction);
  }

  async getResourcePermissionsByRoleId(
    roleId: string,
    resource: Resource
  ): Promise<(CrudAction | CustomAction)[]> {
    const permissions = await this.client.rolePermission.findMany({
      where: {
        roleId,
        OR: [{ resource }, { resource: Resource.All }],
      },
      select: {
        action: true,
        resource: true,
      },
    });
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
    // Validate that permissions array is not empty to prevent privilege escalation
    if (permissions.length === 0) {
      return [];
    }

    const permissionPairs = permissions.map((p) => {
      const { resource, action } = parsePermissionString(p);
      return { resource, action };
    });

    // Convert permission pairs to JSONB for proper serialization
    const permissionPairsJson = JSON.stringify(permissionPairs);

    // Query 1: PBAC enabled - teams where user has PBAC permissions (direct or via org)
    const pbacTeamsPromise = this.client.$queryRaw<{ teamId: number }[]>`
      SELECT DISTINCT "teamId"
      FROM (
        -- Direct team PBAC permissions
        SELECT m."teamId"
        FROM "Membership" m
        INNER JOIN "Role" r ON m."customRoleId" = r.id
        INNER JOIN "Team" t ON m."teamId" = t.id
        WHERE m."userId" = ${userId}
          AND m."accepted" = true
          AND m."customRoleId" IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM "TeamFeatures" f
            WHERE f."teamId" = t.id
              AND f."featureId" = ${this.PBAC_FEATURE_FLAG}
          )
          AND (
            SELECT COUNT(*)
            FROM jsonb_array_elements(${permissionPairsJson}::jsonb) AS required_perm
            WHERE EXISTS (
              SELECT 1
              FROM "RolePermission" rp
              WHERE rp."roleId" = r.id
                AND (
                  (rp."resource" = '*' AND rp."action" = '*') OR
                  (rp."resource" = '*' AND rp."action" = required_perm->>'action') OR
                  (rp."resource" = required_perm->>'resource' AND rp."action" = '*') OR
                  (rp."resource" = required_perm->>'resource' AND rp."action" = required_perm->>'action')
                )
            )
          ) = ${permissions.length}

        UNION ALL

        -- Child teams via org PBAC permissions
        SELECT child."id" as "teamId"
        FROM "Membership" org_m
        INNER JOIN "Role" org_r ON org_m."customRoleId" = org_r.id
        INNER JOIN "Team" org_t ON org_m."teamId" = org_t.id
        INNER JOIN "Team" child ON child."parentId" = org_m."teamId"
        WHERE org_m."userId" = ${userId}
          AND org_m."accepted" = true
          AND org_m."customRoleId" IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM "TeamFeatures" f
            WHERE f."teamId" = org_t.id
              AND f."featureId" = ${this.PBAC_FEATURE_FLAG}
          )
          AND (
            SELECT COUNT(*)
            FROM jsonb_array_elements(${permissionPairsJson}::jsonb) AS required_perm
            WHERE EXISTS (
              SELECT 1
              FROM "RolePermission" rp
              WHERE rp."roleId" = org_r.id
                AND (
                  (rp."resource" = '*' AND rp."action" = '*') OR
                  (rp."resource" = '*' AND rp."action" = required_perm->>'action') OR
                  (rp."resource" = required_perm->>'resource' AND rp."action" = '*') OR
                  (rp."resource" = required_perm->>'resource' AND rp."action" = required_perm->>'action')
                )
            )
          ) = ${permissions.length}
      ) AS pbac_teams
    `;

    // Query 2: PBAC disabled - teams where user has fallback roles (direct or via org)
    const fallbackTeamsPromise = this.client.$queryRaw<{ teamId: number }[]>`
      SELECT DISTINCT "teamId"
      FROM (
        -- Direct team fallback roles (non-PBAC teams)
        SELECT m."teamId"
        FROM "Membership" m
        INNER JOIN "Team" t ON m."teamId" = t.id
        WHERE m."userId" = ${userId}
          AND m."accepted" = true
          AND m."role"::text = ANY(${fallbackRoles})
          AND NOT EXISTS (
            SELECT 1
            FROM "TeamFeatures" f
            WHERE f."teamId" = t.id
              AND f."featureId" = ${this.PBAC_FEATURE_FLAG}
          )

        UNION ALL

        -- Child teams via org fallback roles (non-PBAC orgs)
        SELECT child."id" as "teamId"
        FROM "Membership" org_m
        INNER JOIN "Team" org_t ON org_m."teamId" = org_t.id
        INNER JOIN "Team" child ON child."parentId" = org_m."teamId"
        WHERE org_m."userId" = ${userId}
          AND org_m."accepted" = true
          AND org_m."role"::text = ANY(${fallbackRoles})
          AND NOT EXISTS (
            SELECT 1
            FROM "TeamFeatures" f
            WHERE f."teamId" = org_t.id
              AND f."featureId" = ${this.PBAC_FEATURE_FLAG}
          )
      ) AS fallback_teams
    `;

    const [pbacTeams, fallbackTeams] = await Promise.all([pbacTeamsPromise, fallbackTeamsPromise]);

    const allTeamIds = Array.from(
      new Set([...pbacTeams.map((team) => team.teamId), ...fallbackTeams.map((team) => team.teamId)])
    );

    return allTeamIds;
  }
}
