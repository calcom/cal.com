import db from "@calcom/prisma";
import type { PrismaClient as PrismaClientWithExtensions } from "@calcom/prisma";

import { PermissionMapper } from "../../domain/mappers/PermissionMapper";
import type { TeamPermissions } from "../../domain/models/Permission";
import type { IPermissionRepository } from "../../domain/repositories/IPermissionRepository";
import type { CrudAction, CustomAction } from "../../domain/types/permission-registry";
import { Resource, type PermissionString } from "../../domain/types/permission-registry";

export class PermissionRepository implements IPermissionRepository {
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

  async checkRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const [resource, action] = permission.split(".");
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
      const [resource, action] = p.split(".");
      return { resource, action };
    });
    const resourceActions = permissionPairs.map((p) => [p.resource, p.action]);
    const resources = permissionPairs.map((p) => p.resource);
    const actions = permissionPairs.map((p) => p.action);

    const matchingPermissions = await this.client.$queryRaw<[{ count: bigint }]>`
      WITH permission_checks AS (
        -- Universal permission (*,*)
        SELECT 1 as match FROM "RolePermission"
        WHERE "roleId" = ${roleId} AND "resource" = '*' AND "action" = '*'

        UNION ALL

        -- Wildcard resource with specific actions
        SELECT 1 as match FROM "RolePermission"
        WHERE "roleId" = ${roleId} AND "resource" = '*' AND "action" = ANY(${actions})

        UNION ALL

        -- Specific resources with wildcard action
        SELECT 1 as match FROM "RolePermission"
        WHERE "roleId" = ${roleId} AND "action" = '*' AND "resource" = ANY(${resources})

        UNION ALL

        -- Exact resource-action pairs
        SELECT 1 as match FROM "RolePermission"
        WHERE "roleId" = ${roleId} AND ("resource", "action") = ANY(${resourceActions})
      )
      SELECT COUNT(*) as count FROM permission_checks
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

  async getTeamIdsWithPermission(userId: number, permission: PermissionString): Promise<number[]> {
    return this.getTeamIdsWithPermissions(userId, [permission]);
  }

  async getTeamIdsWithPermissions(userId: number, permissions: PermissionString[]): Promise<number[]> {
    // Validate that permissions array is not empty to prevent privilege escalation
    if (permissions.length === 0) {
      return [];
    }

    const permissionPairs = permissions.map((p) => {
      const [resource, action] = p.split(".");
      return { resource, action };
    });

    const teamsWithPermission = await this.client.$queryRaw<{ teamId: number }[]>`
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

    return teamsWithPermission.map((team) => team.teamId);
  }
}
