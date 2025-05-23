import type { TeamPermissions, Permission } from "../models/Permission";
import type { Resource, CrudAction, CustomAction, PermissionString } from "../types/permission-registry";

export class PermissionMapper {
  static toDomain(
    dbPermissions: {
      teamId: number;
      role: {
        id: string | null;
        permissions: { resource: string | null; action: string | null }[];
      } | null;
    }[]
  ): TeamPermissions[] {
    return dbPermissions
      .filter((membership) => membership.teamId && membership.role?.id && membership.role.permissions)
      .map((membership) => ({
        teamId: membership.teamId,
        roleId: membership.role!.id!,
        permissions: membership
          .role!.permissions.filter(
            (p): p is { resource: string; action: string } =>
              typeof p.resource === "string" &&
              typeof p.action === "string" &&
              p.resource !== null &&
              p.action !== null
          )
          .map((p) => ({
            resource: p.resource as Resource,
            action: p.action as CrudAction | CustomAction,
          })),
      }));
  }

  static toPermissionString(permission: Permission): PermissionString {
    return `${permission.resource}.${permission.action}` as PermissionString;
  }

  static fromPermissionString(permissionString: PermissionString): Permission {
    const [resource, action] = permissionString.split(".");
    return {
      resource: resource as Resource,
      action: action as CrudAction | CustomAction,
    };
  }
}
