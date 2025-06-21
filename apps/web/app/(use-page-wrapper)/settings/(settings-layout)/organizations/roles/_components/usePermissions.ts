import { CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { PERMISSION_REGISTRY } from "@calcom/features/pbac/domain/types/permission-registry";

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

export function usePermissions(): UsePermissionsReturn {
  const getAllPossiblePermissions = () => {
    const permissions: string[] = [];
    Object.entries(PERMISSION_REGISTRY).forEach(([resource, config]) => {
      if (resource !== "*") {
        Object.keys(config).forEach((action) => {
          permissions.push(`${resource}.${action}`);
        });
      }
    });
    return permissions;
  };

  const hasAllPermissions = (permissions: string[]) => {
    return Object.entries(PERMISSION_REGISTRY).every(([resource, config]) => {
      if (resource === "*") return true;
      return Object.keys(config).every((action) => permissions.includes(`${resource}.${action}`));
    });
  };

  const getResourcePermissionLevel = (resource: string, permissions: string[]): PermissionLevel => {
    if (resource === "*") {
      return permissions.includes("*.*") ? "all" : "none";
    }

    const resourceConfig = PERMISSION_REGISTRY[resource as keyof typeof PERMISSION_REGISTRY];
    if (!resourceConfig) return "none";

    const allResourcePerms = Object.keys(resourceConfig).map((action) => `${resource}.${action}`);
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
      const resourceConfig = PERMISSION_REGISTRY[resource as keyof typeof PERMISSION_REGISTRY];

      if (!resourceConfig) return currentPermissions;

      switch (level) {
        case "none":
          // No permissions to add, just keep other permissions
          break;
        case "read":
          newPermissions.push(`${resource}.${CrudAction.Read}`);
          break;
        case "all":
          const allResourcePerms = Object.keys(resourceConfig).map((action) => `${resource}.${action}`);
          newPermissions.push(...allResourcePerms);
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

    // Then toggle the permission
    if (enabled) {
      newPermissions.push(permission);
    } else {
      newPermissions = newPermissions.filter((p) => p !== permission);
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
