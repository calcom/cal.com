import type { PrismaClient } from "@calcom/prisma";

import type { PermissionString, Resource, CrudAction, CustomAction } from "../types/permission-registry";
import type { RoleService } from "./role.service";

export class PermissionCheckService {
  private prisma: PrismaClient;

  constructor(private roleService: RoleService, prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async hasPermission(
    params: { membershipId: number } | { userId: number; teamId: number },
    permission: PermissionString
  ): Promise<boolean> {
    // Get membership either directly or by userId+teamId
    const membership = await this.getMembership(params);
    if (!membership) return false;

    // First check if user has a custom role
    if (membership.customRoleId) {
      const hasCustomPermission = await this.checkCustomRolePermission(membership.customRoleId, permission);
      if (hasCustomPermission) return true;
    }

    // Get the default role ID for the membership role
    const defaultRoleId = await this.roleService.getDefaultRoleId(membership.role);
    return this.checkCustomRolePermission(defaultRoleId, permission);
  }

  async hasPermissions(
    params: { membershipId: number } | { userId: number; teamId: number },
    permissions: PermissionString[]
  ): Promise<boolean> {
    // Get membership either directly or by userId+teamId
    const membership = await this.getMembership(params);
    if (!membership) return false;

    // Check all permissions (AND condition)
    for (const permission of permissions) {
      // Check custom role first
      if (membership.customRoleId) {
        const hasCustomPermission = await this.checkCustomRolePermission(membership.customRoleId, permission);
        if (hasCustomPermission) continue;
      }

      // Get the default role ID for the membership role
      const defaultRoleId = await this.roleService.getDefaultRoleId(membership.role);
      const hasDefaultPermission = await this.checkCustomRolePermission(defaultRoleId, permission);
      if (!hasDefaultPermission) return false;
    }

    return true;
  }

  private async getMembership(params: { membershipId: number } | { userId: number; teamId: number }) {
    if ("membershipId" in params) {
      return this.prisma.membership.findUnique({
        where: { id: params.membershipId },
        select: {
          role: true,
          customRoleId: true,
        },
      });
    } else {
      return this.prisma.membership.findFirst({
        where: {
          userId: params.userId,
          teamId: params.teamId,
        },
        select: {
          role: true,
          customRoleId: true,
        },
      });
    }
  }

  private async checkCustomRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const role = await this.roleService.getRole(roleId);
    if (!role) return false;

    const [resource, action] = permission.split(".") as [Resource, CrudAction | CustomAction];

    // Check for wildcard permissions first
    const hasWildcardPermission = role.permissions.some(
      (p) => (p.resource === "*" || p.resource === resource) && (p.action === "*" || p.action === action)
    );

    if (hasWildcardPermission) return true;

    // Check for exact permission match
    return role.permissions.some((p) => p.resource === resource && p.action === action);
  }
}
