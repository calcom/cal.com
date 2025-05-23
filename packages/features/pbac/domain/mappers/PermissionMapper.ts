import type { TeamPermissions, Permission } from "../models/Permission";
import { CrudAction, CustomAction } from "../types/permission-registry";
import type { PermissionString, Resource } from "../types/permission-registry";

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
    if (!permissionString || typeof permissionString !== "string" || !permissionString.includes(".")) {
      throw new Error(`Invalid permission format: ${permissionString}`);
    }

    const [resource, action] = permissionString.split(".");
    if (!resource || !action) {
      throw new Error(`Invalid permission format: ${permissionString}`);
    }

    return {
      resource: resource as Resource,
      action: action as CrudAction | CustomAction,
    };
  }

  static toActionMap(permissions: PermissionString[]): Record<CrudAction | CustomAction, boolean> {
    const actionMap = {} as Record<CrudAction | CustomAction, boolean>;

    // Initialize all actions as false
    Object.values(CrudAction).forEach((action) => {
      if (action !== "*") actionMap[action] = false;
    });
    Object.values(CustomAction).forEach((action) => {
      actionMap[action] = false;
    });

    // Set permitted actions to true
    permissions.forEach((permString) => {
      try {
        const { action } = this.fromPermissionString(permString);
        if (action === "*") {
          // If wildcard, set all actions to true
          Object.keys(actionMap).forEach((key) => {
            actionMap[key as CrudAction | CustomAction] = true;
          });
        } else {
          actionMap[action] = true;
        }
      } catch (error) {
        console.error(`Invalid permission string: ${permString}`);
      }
    });

    return actionMap;
  }
}
