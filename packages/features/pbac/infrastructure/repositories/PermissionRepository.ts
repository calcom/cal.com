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
    const permissionPairs = permissions.map((p) => {
      const [resource, action] = p.split(".");
      return { resource, action };
    });
    const matchingPermissions = await this.client.rolePermission.count({
      where: {
        roleId,
        OR: [
          { resource: "*", action: "*" },
          {
            AND: [{ resource: "*" }, { action: { in: permissionPairs.map((p) => p.action) } }],
          },
          {
            AND: [{ resource: { in: permissionPairs.map((p) => p.resource) } }, { action: "*" }],
          },
          {
            OR: permissionPairs.map((p) => ({
              AND: [{ resource: p.resource }, { action: p.action }],
            })),
          },
        ],
      },
    });
    return matchingPermissions >= permissions.length;
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
}
