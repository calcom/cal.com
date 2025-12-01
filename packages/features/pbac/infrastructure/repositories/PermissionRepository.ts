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

    const teamsWithPermissionPromise = this.client.$queryRaw<{ teamId: number }[]>`
      SELECT DISTINCT m."teamId"
      FROM "Membership" m
      INNER JOIN "Role" r ON m."customRoleId" = r.id
      WHERE m."userId" = ${userId}
        AND m."accepted" = true
        AND m."customRoleId" IS NOT NULL
        AND (
          SELECT COUNT(*)
          FROM jsonb_array_elements(${JSON.stringify(permissionPairs)}::jsonb) AS required_perm(perm)
          WHERE EXISTS (
            SELECT 1
            FROM "RolePermission" rp
            WHERE rp."roleId" = r.id
              AND (
                (rp."resource" = '*' AND rp."action" = '*') OR
                (rp."resource" = '*' AND rp."action" = required_perm.perm->>'action') OR
                (rp."resource" = required_perm.perm->>'resource' AND rp."action" = '*') OR
                (rp."resource" = required_perm.perm->>'resource' AND rp."action" = required_perm.perm->>'action')
              )
          )
        ) = ${permissions.length}
    `;

    const teamsWithFallbackRolesPromise =
      fallbackRoles.length > 0
        ? this.client.$queryRaw<{ teamId: number }[]>`
            SELECT DISTINCT m."teamId"
            FROM "Membership" m
            INNER JOIN "Team" t ON m."teamId" = t.id
            LEFT JOIN "TeamFeatures" f ON t.id = f."teamId" AND f."featureId" = ${this.PBAC_FEATURE_FLAG}
            WHERE m."userId" = ${userId}
              AND m."accepted" = true
              AND m."role"::text = ANY(${fallbackRoles})
              AND f."teamId" IS NULL
          `
        : Promise.resolve<{ teamId: number }[]>([]);

    const [teamsWithPermission, teamsWithFallbackRoles] = await Promise.all([
      teamsWithPermissionPromise,
      teamsWithFallbackRolesPromise,
    ]);

    const pbacTeamIds = teamsWithPermission.map((team) => team.teamId);
    const fallbackTeamIds = teamsWithFallbackRoles.map((team) => team.teamId);

    const allTeamIds = Array.from(new Set([...pbacTeamIds, ...fallbackTeamIds]));
    return allTeamIds;
  }
}
