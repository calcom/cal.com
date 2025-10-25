import { CrudAction, Scope } from "@calcom/features/pbac/domain/types/permission-registry";
import { getPermissionsForScope } from "@calcom/features/pbac/domain/types/permission-registry";
import {
  getTransitiveDependencies,
  getTransitiveDependents,
} from "@calcom/features/pbac/utils/permissionTraversal";

export type PermissionLevel = "none" | "read" | "all";

interface UsePermissionsReturn {
  hasAllPermissions: (permissions: string[]) => boolean;
  getResourcePermissionLevel: (resource: string, permissions: string[]) => PermissionLevel;
  toggleResourcePermissionLevel: (
    resource: string,
    level: PermissionLevel,
    currentPermissions: string[]
  ) => string[];
  toggleSinglePermission: (permission: string, enabled: boolean, currentPermissions: string[]) => string[];
}

export function usePermissions(scope: Scope = Scope.Organization): UsePermissionsReturn {
  const getAllPossiblePermissions = () => {
    const permissions: string[] = [];
    const scopedRegistry = getPermissionsForScope(scope);
    Object.entries(scopedRegistry).forEach(([resource, config]) => {
      if (resource !== "*") {
        Object.keys(config)
          .filter((action) => !action.startsWith("_"))
          .forEach((action) => {
            permissions.push(`${resource}.${action}`);
          });
      }
    });
    return permissions;
  };

  const hasAllPermissions = (permissions: string[]) => {
    const scopedRegistry = getPermissionsForScope(scope);
    return Object.entries(scopedRegistry).every(([resource, config]) => {
      if (resource === "*") return true;
      return Object.keys(config)
        .filter((action) => !action.startsWith("_"))
        .every((action) => permissions.includes(`${resource}.${action}`));
    });
  };

  const getResourcePermissionLevel = (resource: string, permissions: string[]): PermissionLevel => {
    if (resource === "*") {
      return permissions.includes("*.*") ? "all" : "none";
    }

    const scopedRegistry = getPermissionsForScope(scope);
    const resourceConfig = scopedRegistry[resource as keyof typeof scopedRegistry];
    if (!resourceConfig) return "none";

    // Check if global all permissions (*.*) is present
    if (permissions.includes("*.*")) {
      return "all";
    }

    // Filter out internal keys like _resource when checking permissions
    const allResourcePerms = Object.keys(resourceConfig)
      .filter((action) => !action.startsWith("_"))
      .map((action) => `${resource}.${action}`);
    const hasAllPerms = allResourcePerms.every((p) => permissions.includes(p));
    const hasReadPerm = permissions.includes(`${resource}.${CrudAction.Read}`);

    if (hasAllPerms) return "all";
    if (hasReadPerm) return "read";
    return "none";
  };

  const toggleResourcePermissionLevel = (
    resource: string,
    level: PermissionLevel,
    currentPermissions: string[]
  ): string[] => {
    // First, remove *.* since we're modifying permissions
    let newPermissions = currentPermissions.filter((p) => p !== "*.*");

    if (resource === "*") {
      if (level === "all") {
        // When selecting all resources, add *.* and all individual permissions
        const allPossiblePerms = getAllPossiblePermissions();
        newPermissions = ["*.*", ...allPossiblePerms];
      }
      // When deselecting all resources, we've already removed *.* above
    } else {
      // Filter out current resource permissions
      newPermissions = newPermissions.filter((p) => !p.startsWith(`${resource}.`));
      const scopedRegistry = getPermissionsForScope(scope);
      const resourceConfig = scopedRegistry[resource as keyof typeof scopedRegistry];

      if (!resourceConfig) return currentPermissions;

      // Declare variable before switch to avoid scope issues
      let allResourcePerms: string[];

      switch (level) {
        case "none":
          // No permissions to add, just keep other permissions
          break;
        case "read":
          // Only add read permission
          newPermissions.push(`${resource}.${CrudAction.Read}`);
          break;
        case "all":
          // Add all permissions for this resource (excluding internal keys)
          allResourcePerms = Object.keys(resourceConfig)
            .filter((action) => !action.startsWith("_"))
            .map((action) => `${resource}.${action}`);

          // Add the resource permissions
          newPermissions.push(...allResourcePerms);

          // Add all transitive dependencies for each permission
          allResourcePerms.forEach((perm) => {
            const dependencies = getTransitiveDependencies(perm, scope);
            dependencies.forEach((dep) => {
              if (!newPermissions.includes(dep)) {
                newPermissions.push(dep);
              }
            });
          });
          break;
      }

      // Only add *.* back if all permissions are now selected
      if (hasAllPermissions(newPermissions)) {
        newPermissions.push("*.*");
      }
    }

    return newPermissions;
  };

  const toggleSinglePermission = (
    permission: string,
    enabled: boolean,
    currentPermissions: string[]
  ): string[] => {
    // First, remove *.* since we're modifying individual permissions
    let newPermissions = currentPermissions.filter((p) => p !== "*.*");

    if (enabled) {
      // Add the requested permission
      newPermissions.push(permission);

      // Add all transitive dependencies
      const dependencies = getTransitiveDependencies(permission, scope);
      dependencies.forEach((dependency) => {
        if (!newPermissions.includes(dependency)) {
          newPermissions.push(dependency);
        }
      });
    } else {
      // When disabling a permission, first remove the permission itself
      newPermissions = newPermissions.filter((p) => p !== permission);

      // Remove all transitive dependents
      const dependents = getTransitiveDependents(permission, scope);
      dependents.forEach((dependent) => {
        newPermissions = newPermissions.filter((p) => p !== dependent);
      });
    }

    // Only add *.* back if all permissions are now selected
    if (hasAllPermissions(newPermissions)) {
      newPermissions.push("*.*");
    }

    return newPermissions;
  };

  return {
    hasAllPermissions,
    getResourcePermissionLevel,
    toggleResourcePermissionLevel,
    toggleSinglePermission,
  };
}
