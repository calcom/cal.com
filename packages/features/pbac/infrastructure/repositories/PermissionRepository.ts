import logger from "@calcom/lib/logger";
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
  private readonly logger = logger.getSubLogger({ prefix: ["PermissionRepository"] });

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
    orgId,
  }: {
    userId: number;
    permission: PermissionString;
    fallbackRoles: MembershipRole[];
    orgId?: number;
  }): Promise<number[]> {
    return this.getTeamIdsWithPermissions({ userId, permissions: [permission], fallbackRoles, orgId });
  }

  async getTeamIdsWithPermissions({
    userId,
    permissions,
    fallbackRoles,
    orgId,
  }: {
    userId: number;
    permissions: PermissionString[];
    fallbackRoles: MembershipRole[];
    orgId?: number;
  }): Promise<number[]> {
    // Validate that permissions array is not empty to prevent privilege escalation
    if (permissions.length === 0) {
      return [];
    }

    const permissionPairs = permissions.map((p) => {
      const { resource, action } = parsePermissionString(p);
      return { resource, action };
    });

    const permissionPairsJson = JSON.stringify(permissionPairs);

    const [teamsWithPermission, teamsWithFallbackRoles] = await Promise.all([
      this.getTeamsWithPBACPermissions(userId, permissionPairsJson, permissions.length, orgId),
      this.getTeamsWithFallbackRoles(userId, fallbackRoles, orgId),
    ]);

    const pbacTeamIds = teamsWithPermission.map((team) => team.teamId);
    const fallbackTeamIds = teamsWithFallbackRoles.map((team) => team.teamId);

    const allTeamIds = Array.from(new Set([...pbacTeamIds, ...fallbackTeamIds]));
    return allTeamIds;
  }

  /**
   * Gets teams where user has PBAC permissions (direct memberships + child teams via org membership)
   * @param orgId Optional organization ID to scope results. When null/undefined, returns all teams.
   */
  private async getTeamsWithPBACPermissions(
    userId: number,
    permissionPairsJson: string,
    permissionsCount: number,
    orgId?: number | null
  ): Promise<{ teamId: number }[]> {
    return this.client.$queryRaw<{ teamId: number }[]>`
      WITH required_permissions AS (
        SELECT 
          required_perm->>'resource' as resource,
          required_perm->>'action' as action
        FROM jsonb_array_elements(${permissionPairsJson}::jsonb) AS required_perm
      )
      SELECT DISTINCT m."teamId"
      FROM "Membership" m
      INNER JOIN "Role" r ON m."customRoleId" = r.id
      INNER JOIN "Team" t ON m."teamId" = t.id
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."customRoleId" IS NOT NULL
        AND (${orgId}::bigint IS NULL OR t."id" = ${orgId} OR t."parentId" = ${orgId})
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
        ) = ${permissionsCount}
      UNION
      SELECT DISTINCT child."id"
      FROM "Membership" m
      INNER JOIN "Role" r ON m."customRoleId" = r.id
      INNER JOIN "Team" org ON m."teamId" = org.id
      INNER JOIN "Team" child ON child."parentId" = org.id
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."customRoleId" IS NOT NULL
        AND (${orgId}::bigint IS NULL OR org."id" = ${orgId} OR child."id" = ${orgId} OR child."parentId" = ${orgId})
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
        ) = ${permissionsCount}
    `;
  }

  /**
   * Gets teams where user has fallback roles (direct memberships + child teams via org membership, PBAC disabled)
   * @param orgId Optional organization ID to scope results. When null/undefined, returns all teams.
   */
  private async getTeamsWithFallbackRoles(
    userId: number,
    fallbackRoles: MembershipRole[],
    orgId?: number | null
  ): Promise<{ teamId: number }[]> {
    return this.client.$queryRaw<{ teamId: number }[]>`
      SELECT DISTINCT m."teamId"
      FROM "Membership" m
      INNER JOIN "Team" t ON m."teamId" = t.id
      LEFT JOIN "TeamFeatures" f ON f."teamId" = t.id AND f."featureId" = ${this.PBAC_FEATURE_FLAG} AND f.enabled = true
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."role"::text = ANY(${fallbackRoles})
        AND f."teamId" IS NULL
        AND (${orgId}::bigint IS NULL OR t."id" = ${orgId} OR t."parentId" = ${orgId})
      UNION
      SELECT DISTINCT child."id"
      FROM "Membership" m
      INNER JOIN "Team" org ON m."teamId" = org.id
      INNER JOIN "Team" child ON child."parentId" = org.id
      LEFT JOIN "TeamFeatures" f ON f."teamId" = org.id AND f."featureId" = ${this.PBAC_FEATURE_FLAG} AND f.enabled = true
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."role"::text = ANY(${fallbackRoles})
        AND f."teamId" IS NULL
        AND (${orgId}::bigint IS NULL OR org."id" = ${orgId} OR child."id" = ${orgId} OR child."parentId" = ${orgId})
    `;
  }
}
