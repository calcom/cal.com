import type { PermissionString, Resource, Action } from "../types/permission-registry";
import { PERMISSION_REGISTRY, getAllPermissions } from "../types/permission-registry";

export class PermissionService {
  validatePermission(permission: PermissionString): boolean {
    const [resource, action] = permission.split(".") as [Resource, Action];
    return !!PERMISSION_REGISTRY[resource]?.[action];
  }

  validatePermissions(permissions: PermissionString[]): boolean {
    return permissions.every((permission) => this.validatePermission(permission));
  }

  getAllPermissions() {
    return getAllPermissions();
  }

  getPermissionsByCategory(category: string) {
    return getAllPermissions().filter((p) => p.category === category);
  }

  getPermissionCategories(): string[] {
    return Array.from(new Set(getAllPermissions().map((p) => p.category)));
  }

  getPermissionsByResource(resource: Resource) {
    const resourcePermissions = PERMISSION_REGISTRY[resource];
    if (!resourcePermissions) return [];

    return Object.entries(resourcePermissions).map(([action, details]) => ({
      resource,
      action: action as Action,
      ...details,
    }));
  }

  getPermissionsByAction(action: Action) {
    return getAllPermissions().filter((p) => p.action === action);
  }
}
