import { CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { RESOURCE_CONFIG } from "@calcom/features/pbac/lib/constants";

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
    Object.entries(RESOURCE_CONFIG).forEach(([resource, config]) => {
      if (resource !== "*") {
        Object.keys(config.actions).forEach((action) => {
          permissions.push(`${resource}.${action}`);
        });
      }
    });
    return permissions;
  };

  const hasAllPermissions = (permissions: string[]) => {
    return Object.entries(RESOURCE_CONFIG).every(([resource, config]) => {
      if (resource === "*") return true;
      return Object.keys(config.actions).every((action) => permissions.includes(`${resource}.${action}`));
    });
  };

  const getResourcePermissionLevel = (resource: string, permissions: string[]): PermissionLevel => {
    if (resource === "*") {
      return permissions.includes("*.*") ? "all" : "none";
    }

    const resourceConfig = RESOURCE_CONFIG[resource as keyof typeof RESOURCE_CONFIG];
    if (!resourceConfig) return "none";

    const allResourcePerms = Object.keys(resourceConfig.actions).map((action) => `${resource}.${action}`);
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
    let newPermissions: string[];

    if (resource === "*") {
      if (level === "all") {
        // When selecting all resources, add *.* and all individual permissions
        newPermissions = ["*.*", ...getAllPossiblePermissions()];
      } else {
        // When deselecting all resources, remove *.* and keep individual selections
        newPermissions = currentPermissions.filter((p) => p !== "*.*");
      }
    } else {
      // Filter out current resource permissions
      const otherPermissions = currentPermissions.filter((p) => !p.startsWith(`${resource}.`));
      const resourceConfig = RESOURCE_CONFIG[resource as keyof typeof RESOURCE_CONFIG];

      if (!resourceConfig) return currentPermissions;

      switch (level) {
        case "none":
          newPermissions = otherPermissions;
          break;
        case "read":
          newPermissions = [...otherPermissions, `${resource}.${CrudAction.Read}`];
          break;
        case "all":
          const allResourcePerms = Object.keys(resourceConfig.actions).map(
            (action) => `${resource}.${action}`
          );
          newPermissions = [...otherPermissions, ...allResourcePerms];
          break;
      }

      // Check if all resources now have all permissions
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
    const newPermissions = enabled
      ? [...currentPermissions, permission]
      : currentPermissions.filter((p) => p !== permission);

    // Update *.* based on whether all permissions are selected
    if (hasAllPermissions(newPermissions) && !newPermissions.includes("*.*")) {
      newPermissions.push("*.*");
    } else if (!hasAllPermissions(newPermissions) && newPermissions.includes("*.*")) {
      newPermissions.splice(newPermissions.indexOf("*.*"), 1);
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
