import type {
  PermissionString,
  Resource,
  CrudAction,
  CustomAction,
  PermissionDetails,
} from "../types/permission-registry";
import { PERMISSION_REGISTRY } from "../types/permission-registry";

export class PermissionService {
  validatePermission(permission: PermissionString): boolean {
    const [resource, action] = permission.split(".") as [Resource, CrudAction | CustomAction];
    return !!PERMISSION_REGISTRY[resource]?.[action];
  }

  validatePermissions(permissions: PermissionString[]): boolean {
    return permissions.every((permission) => this.validatePermission(permission));
  }

  // Helper function to check if a permission matches a pattern (including wildcards)
  permissionMatches(pattern: PermissionString, permission: PermissionString): boolean {
    // Handle full wildcard
    if (pattern === "*.*") return true;

    const [patternResource, patternAction] = pattern.split(".") as [
      Resource | "*",
      CrudAction | CustomAction | "*"
    ];
    const [permissionResource, permissionAction] = permission.split(".") as [
      Resource,
      CrudAction | CustomAction
    ];

    // Check if resource matches (either exact match or wildcard)
    const resourceMatches = patternResource === "*" || patternResource === permissionResource;

    // Check if action matches (either exact match or wildcard)
    const actionMatches = patternAction === "*" || patternAction === permissionAction;

    return resourceMatches && actionMatches;
  }

  // Helper function to create a permission string
  createPermissionString(
    resource: Resource | "*",
    action: CrudAction | CustomAction | "*",
    isCustom = false
  ): PermissionString {
    const prefix = isCustom ? "custom:" : "";
    return `${prefix}${resource}.${action}` as PermissionString;
  }

  // Helper function to get all permissions as an array
  getAllPermissions(): Array<{ resource: Resource; action: CrudAction | CustomAction } & PermissionDetails> {
    const permissions: Array<{ resource: Resource; action: CrudAction | CustomAction } & PermissionDetails> =
      [];

    Object.entries(PERMISSION_REGISTRY).forEach(([resource, actions]) => {
      Object.entries(actions).forEach(([action, details]) => {
        permissions.push({
          resource: resource as Resource,
          action: action as CrudAction | CustomAction,
          ...details,
        });
      });
    });

    return permissions;
  }

  getPermissionsByCategory(category: string) {
    return this.getAllPermissions().filter((p) => p.category === category);
  }

  getPermissionCategories(): string[] {
    return Array.from(new Set(this.getAllPermissions().map((p) => p.category)));
  }

  getPermissionsByResource(resource: Resource) {
    const resourcePermissions = PERMISSION_REGISTRY[resource];
    if (!resourcePermissions) return [];

    return Object.entries(resourcePermissions).map(([action, details]) => ({
      resource,
      action: action as CrudAction | CustomAction,
      ...details,
    }));
  }

  getPermissionsByAction(action: CrudAction | CustomAction) {
    return this.getAllPermissions().filter((p) => p.action === action);
  }
}
