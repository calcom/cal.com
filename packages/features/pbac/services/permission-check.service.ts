import type { PrismaClient } from "@calcom/prisma";

import type { PermissionString } from "../types/permission-registry";
import type { RoleService } from "./role.service";

export class PermissionCheckService {
  constructor(private roleService: RoleService, private prisma: PrismaClient) {}

  async hasPermission(
    query: { membershipId?: number; userId?: number; teamId?: number },
    permission: PermissionString
  ): Promise<boolean> {
    const membership = await this.getMembership(query);
    if (!membership) return false;

    // Check custom role permissions
    if (membership.customRoleId) {
      const [resource, action] = permission.split(".");
      // Query for the specific permission or wildcard permissions
      const hasPermission = await this.prisma.rolePermission.findFirst({
        where: {
          roleId: membership.customRoleId,
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

    return false;
  }

  async hasPermissions(
    query: { membershipId?: number; userId?: number; teamId?: number },
    permissions: PermissionString[]
  ): Promise<boolean> {
    const membership = await this.getMembership(query);
    if (!membership) return false;

    // Check custom role permissions
    if (membership.customRoleId) {
      // Split all permissions into resource and action pairs
      const permissionPairs = permissions.map((p) => {
        const [resource, action] = p.split(".");
        return { resource, action };
      });

      // Count how many permissions match
      const matchingPermissionsCount = await this.prisma.rolePermission.count({
        where: {
          roleId: membership.customRoleId,
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

      // All permissions must be matched
      return matchingPermissionsCount >= permissions.length;
    }

    return false;
  }

  private async getMembership(query: { membershipId?: number; userId?: number; teamId?: number }) {
    if (query.membershipId) {
      return this.prisma.membership.findUnique({
        where: { id: query.membershipId },
      });
    }

    if (query.userId && query.teamId) {
      return this.prisma.membership.findFirst({
        where: {
          userId: query.userId,
          teamId: query.teamId,
        },
      });
    }

    return null;
  }
}
