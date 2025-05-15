import type { PrismaClient } from "@prisma/client";

import { MembershipRole } from "@calcom/prisma/enums";

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

    // Fall back to default role permissions
    return this.checkDefaultRolePermission(membership.role, permission);
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

      // Fall back to default role permission
      const hasDefaultPermission = this.checkDefaultRolePermission(membership.role, permission);
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

  private checkDefaultRolePermission(role: MembershipRole, permission: PermissionString): boolean {
    // Define default permissions for each role
    const defaultPermissions: Record<MembershipRole, PermissionString[]> = {
      [MembershipRole.OWNER]: ["*.*"], // Owner has all permissions
      [MembershipRole.ADMIN]: [
        "booking.*",
        "eventType.*",
        "team.invite",
        "team.remove",
        "team.changeMemberRole",
        "organization.listMembers",
        "organization.read",
        "organization.update",
        "booking.readTeamBookings",
        "booking.readOrgBookings",
        "apiKey.*",
        "routingForm.*",
        "workflow.*",
        "insights.read",
      ],
      [MembershipRole.MEMBER]: [
        "booking.read",
        "eventType.read",
        "team.read",
        "organization.read",
        "routingForm.read",
      ],
    };

    const rolePermissions = defaultPermissions[role] || [];
    return rolePermissions.some((p) => this.permissionMatches(p, permission));
  }

  private async checkCustomRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const role = await this.roleService.getRole(roleId);
    if (!role) return false;

    const [resource, action] = permission.split(".") as [Resource, CrudAction | CustomAction];
    return role.permissions.some((p) => p.resource === resource && p.action === action);
  }

  private permissionMatches(pattern: PermissionString, permission: PermissionString): boolean {
    if (pattern === "*.*") return true;
    const [patternResource, patternAction] = pattern.split(".") as [Resource, CrudAction | CustomAction];
    const [permissionResource, permissionAction] = permission.split(".") as [
      Resource,
      CrudAction | CustomAction
    ];

    return (
      (patternResource === "*" || patternResource === permissionResource) &&
      (patternAction === "*" || patternAction === permissionAction)
    );
  }
}
