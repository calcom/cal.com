import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";

import kysely from "@calcom/kysely";
import type { PrismaClient } from "@calcom/prisma";

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

export function transformDbPermissionsToTeamPermissions(
  memberships: DbMembership[]
): Record<number, { roleId: string; permissions: PermissionString[] }> {
  const teamPermissions: Record<number, { roleId: string; permissions: PermissionString[] }> = {};

  for (const membership of memberships) {
    if (!membership.teamId || !membership.role?.id || !membership.role.permissions) continue;

    const validPermissions = membership.role.permissions.filter(
      (p): p is { resource: string; action: string } =>
        typeof p.resource === "string" &&
        typeof p.action === "string" &&
        p.resource !== null &&
        p.action !== null
    );

    teamPermissions[membership.teamId] = {
      roleId: membership.role.id,
      permissions: validPermissions.map((p) => `${p.resource}.${p.action}` as PermissionString),
    };
  }

  return teamPermissions;
}

export class PermissionCheckService {
  constructor(private prisma: PrismaClient) {}

  async getUserPermissions(userId: number) {
    // Using kysely here got his query down by 67% in execution time
    const memberships = await kysely
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

    return transformDbPermissionsToTeamPermissions(memberships);
  }

  async hasPermission(
    query: { membershipId?: number; userId?: number; teamId?: number },
    permission: PermissionString
  ): Promise<boolean> {
    const { membership, orgMembership } = await this.getMembership(query);

    // Check team membership first
    if (membership?.customRoleId) {
      const hasTeamPermission = await this.checkRolePermission(membership.customRoleId, permission);
      if (hasTeamPermission) return true;
    }

    // If no team permission and there's an org membership, check org permissions
    if (orgMembership?.customRoleId) {
      return this.checkRolePermission(orgMembership.customRoleId, permission);
    }

    return false;
  }

  async hasPermissions(
    query: { membershipId?: number; userId?: number; teamId?: number },
    permissions: PermissionString[]
  ): Promise<boolean> {
    const { membership, orgMembership } = await this.getMembership(query);

    // Check team membership first
    if (membership?.customRoleId) {
      const hasTeamPermissions = await this.checkRolePermissions(membership.customRoleId, permissions);
      if (hasTeamPermissions) return true;
    }

    // If no team permissions and there's an org membership, check org permissions
    if (orgMembership?.customRoleId) {
      return this.checkRolePermissions(orgMembership.customRoleId, permissions);
    }

    return false;
  }

  private async checkRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const [resource, action] = permission.split(".");
    // TODO: make this kysely query
    const hasPermission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        OR: [
          // Global wildcard
          { resource: "*", action: "*" },
          // Resource wildcard
          { resource: "*", action },
          // Action wildcard
          { resource, action: "*" },
          // Exact match
          { resource, action },
        ],
      },
    });
    return !!hasPermission;
  }

  private async checkRolePermissions(roleId: string, permissions: PermissionString[]): Promise<boolean> {
    const permissionPairs = permissions.map((p) => {
      const [resource, action] = p.split(".");
      return { resource, action };
    });

    const matchingPermissionsCount = await this.prisma.rolePermission.count({
      where: {
        roleId,
        OR: [
          // Global wildcard
          { resource: "*", action: "*" },
          // Resource wildcards
          {
            resource: "*",
            action: { in: permissionPairs.map((p) => p.action) },
          },
          // Action wildcards
          {
            resource: { in: permissionPairs.map((p) => p.resource) },
            action: "*",
          },
          // Exact matches
          {
            OR: permissionPairs.map((p) => ({
              resource: p.resource,
              action: p.action,
            })),
          },
        ],
      },
    });

    return matchingPermissionsCount >= permissions.length;
  }

  private async getMembership(query: { membershipId?: number; userId?: number; teamId?: number }) {
    let membership = null;
    let orgMembership = null;

    // Get the team membership
    if (query.membershipId) {
      membership = await this.prisma.membership.findUnique({
        where: { id: query.membershipId },
        include: {
          team: {
            select: {
              parentId: true,
            },
          },
        },
      });
    } else if (query.userId && query.teamId) {
      membership = await this.prisma.membership.findFirst({
        where: {
          userId: query.userId,
          teamId: query.teamId,
        },
        include: {
          team: {
            select: {
              parentId: true,
            },
          },
        },
      });
    }

    // If we found a membership and the team has a parent org, get the org membership
    if (membership?.team?.parentId) {
      orgMembership = await this.prisma.membership.findFirst({
        where: {
          userId: membership.userId,
          teamId: membership.team.parentId,
        },
      });
    }

    return { membership, orgMembership };
  }
}
