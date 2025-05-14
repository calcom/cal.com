import { MembershipRole } from "@calcom/prisma/enums";

import type { PermissionString, Resource, Action } from "../types/permission-registry";
import type { RoleService } from "./role.service";

export class PermissionCheckService {
  constructor(private roleService: RoleService) {}

  async hasPermission(
    membership: { role: MembershipRole; customRoleId: string | null },
    permission: PermissionString
  ): Promise<boolean> {
    // First check if user has a custom role
    if (membership.customRoleId) {
      const hasCustomPermission = await this.checkCustomRolePermission(membership.customRoleId, permission);
      if (hasCustomPermission) return true;
    }

    // Fall back to default role permissions
    return this.checkDefaultRolePermission(membership.role, permission);
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
        "organization.manage",
      ],
      [MembershipRole.MEMBER]: ["booking.read", "eventType.read", "team.read"],
    };

    const rolePermissions = defaultPermissions[role] || [];
    return rolePermissions.some((p) => this.permissionMatches(p, permission));
  }

  private async checkCustomRolePermission(roleId: string, permission: PermissionString): Promise<boolean> {
    const rolePermissions = await this.roleService.getRolePermissions(roleId);
    const [resource, action] = permission.split(".") as [Resource, Action];
    return rolePermissions.some((p) => p.resource === resource && p.action === action);
  }

  private permissionMatches(pattern: PermissionString, permission: PermissionString): boolean {
    if (pattern === "*.*") return true;
    const [patternResource, patternAction] = pattern.split(".") as [Resource, Action];
    const [permissionResource, permissionAction] = permission.split(".") as [Resource, Action];

    return (
      (patternResource === "*" || patternResource === permissionResource) &&
      (patternAction === "*" || patternAction === permissionAction)
    );
  }
}
