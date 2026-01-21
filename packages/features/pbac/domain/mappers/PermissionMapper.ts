import type { TeamPermissions, Permission } from "../models/Permission";
import { CrudAction, CustomAction, Resource, PERMISSION_REGISTRY } from "../types/permission-registry";
import type { PermissionString, PermissionRegistry } from "../types/permission-registry";

export type ResourceActions<R extends Resource> = keyof PermissionRegistry[R];

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
      .filter(
        (membership) =>
          membership.teamId != null && membership.role?.id != null && membership.role.permissions
      )
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

    // Split from the right side to handle resources with dots
    const lastDotIndex = permissionString.lastIndexOf(".");
    const resource = permissionString.substring(0, lastDotIndex);
    const action = permissionString.substring(lastDotIndex + 1);

    if (!resource || !action) {
      throw new Error(`Invalid permission format: ${permissionString}`);
    }

    return {
      resource: resource as Resource,
      action: action as CrudAction | CustomAction,
    };
  }

  static toActionMap<R extends Resource>(
    permissions: PermissionString[],
    resource: R
  ): Record<ResourceActions<R>, boolean> {
    const actionMap = {} as Record<ResourceActions<R>, boolean>;

    // Initialize all actions as false
    Object.values(CrudAction).forEach((action) => {
      if (action !== CrudAction.All && this.isActionAvailableForResource(resource, action)) {
        actionMap[action as ResourceActions<R>] = false;
      }
    });
    Object.values(CustomAction).forEach((action) => {
      if (this.isActionAvailableForResource(resource, action)) {
        actionMap[action as ResourceActions<R>] = false;
      }
    });

    // Set permitted actions to true
    permissions.forEach((permString) => {
      try {
        // Check for *.* first as it grants all permissions
        if (permString === `${Resource.All}.${CrudAction.All}`) {
          Object.keys(actionMap).forEach((key) => {
            actionMap[key as ResourceActions<R>] = true;
          });
          return;
        }

        const { action, resource: permResource } = this.fromPermissionString(permString);

        // Only process permissions for the requested resource
        if (permResource === resource || permResource === Resource.All) {
          if (action === CrudAction.All) {
            // If wildcard action, set all available actions to true
            Object.keys(actionMap).forEach((key) => {
              actionMap[key as ResourceActions<R>] = true;
            });
          } else if (this.isActionAvailableForResource(resource, action)) {
            actionMap[action as ResourceActions<R>] = true;
          }
        }
      } catch (error) {
        console.error(`Invalid permission string: ${permString}`);
      }
    });

    return actionMap;
  }

  private static isActionAvailableForResource(
    resource: Resource,
    action: CrudAction | CustomAction
  ): boolean {
    return !!PERMISSION_REGISTRY[resource]?.[action];
  }
}
