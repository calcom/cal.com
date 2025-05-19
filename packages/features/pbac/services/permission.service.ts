import type { PermissionString, Resource, CrudAction, CustomAction } from "../types/permission-registry";
import { PERMISSION_REGISTRY, getAllPermissions } from "../types/permission-registry";

export class PermissionService {
  validatePermission(permission: PermissionString): boolean {
    const [resource, action] = permission.split(".") as [Resource, CrudAction | CustomAction];
    return !!PERMISSION_REGISTRY[resource]?.[action];
  }

  validatePermissions(permissions: PermissionString[]): boolean {
    return permissions.every((permission) => this.validatePermission(permission));
  }

  getAllPermissions() {
    // TODO: Rename this shit
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
      action: action as CrudAction | CustomAction,
      ...details,
    }));
  }

  getPermissionsByAction(action: CrudAction | CustomAction) {
    return getAllPermissions().filter((p) => p.action === action);
  }
}
