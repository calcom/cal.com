import { PermissionMapper } from "../domain/mappers/PermissionMapper";
import type { Permission, PermissionPattern, PermissionValidationResult } from "../domain/models/Permission";
import type {
  CrudAction,
  CustomAction,
  PermissionDetails,
  PermissionString,
  Resource,
} from "../domain/types/permission-registry";
import { filterResourceConfig, PERMISSION_REGISTRY } from "../domain/types/permission-registry";

// Helper function to check if an object is PermissionDetails
const isPermissionDetails = (obj: any): obj is PermissionDetails => {
  return obj && "description" in obj && "category" in obj && "i18nKey" in obj && "descriptionI18nKey" in obj;
};

export class PermissionService {
  validatePermission(permission: PermissionString): PermissionValidationResult {
    try {
      const permissionObj = PermissionMapper.fromPermissionString(permission);
      const registryEntry = PERMISSION_REGISTRY[permissionObj.resource];
      const actionEntry = registryEntry?.[permissionObj.action];
      const isValid = !!actionEntry;

      return {
        isValid,
        error: isValid ? null : `Invalid permission: ${permission}`,
      };
    } catch (error) {
      console.debug(`[DEBUG] Error validating permission ${permission}:`, error);
      if (error instanceof Error) {
        return {
          isValid: false,
          error: error.message,
        };
      }
      return {
        isValid: false,
        error: `Invalid permission format: ${permission}`,
      };
    }
  }

  validatePermissions(permissions: PermissionString[]): PermissionValidationResult {
    for (const permission of permissions) {
      const result = this.validatePermission(permission);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true, error: null };
  }

  permissionMatches(pattern: PermissionPattern, permission: Permission): boolean {
    // Handle full wildcard
    if (pattern.resource === "*" && pattern.action === "*") return true;

    // Check if resource matches (either exact match or wildcard)
    const resourceMatches = pattern.resource === "*" || pattern.resource === permission.resource;

    // Check if action matches (either exact match or wildcard)
    const actionMatches = pattern.action === "*" || pattern.action === permission.action;

    return resourceMatches && actionMatches;
  }

  getAllPermissions(): Permission[] {
    const permissions: Permission[] = [];

    Object.entries(PERMISSION_REGISTRY).forEach(([resource, actions]) => {
      const filteredActions = filterResourceConfig(actions);
      Object.entries(filteredActions).forEach(([action, details]) => {
        if (details && isPermissionDetails(details)) {
          permissions.push({
            resource: resource as Resource,
            action: action as CrudAction | CustomAction,
            description: details?.description,
            category: details?.category,
          });
        }
      });
    });

    return permissions;
  }

  getPermissionsByResource(resource: Resource): Permission[] {
    const resourcePermissions = PERMISSION_REGISTRY[resource];
    if (!resourcePermissions) return [];

    const filteredPermissions = filterResourceConfig(resourcePermissions);
    return Object.entries(filteredPermissions)
      .filter(([_, details]) => details !== undefined && isPermissionDetails(details))
      .map(([action, details]) => ({
        resource,
        action: action as CrudAction | CustomAction,
        description: details?.description,
        category: details?.category,
      }));
  }

  getPermissionsByCategory(category: string) {
    return this.getAllPermissions().filter((p) => p.category === category);
  }

  getPermissionCategories(): string[] {
    return Array.from(
      new Set(
        this.getAllPermissions()
          .map((p) => p.category)
          .filter((category): category is string => category !== undefined)
      )
    );
  }

  getPermissionsByAction(action: CrudAction | CustomAction): Permission[] {
    return this.getAllPermissions().filter((p) => p.action === action);
  }
}
