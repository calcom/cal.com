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
    return Object.entries(PERMISSION_REGISTRY).every(([resource, config]) => {
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

    const resourceConfig = PERMISSION_REGISTRY[resource as keyof typeof PERMISSION_REGISTRY];
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
      const resourceConfig = PERMISSION_REGISTRY[resource as keyof typeof PERMISSION_REGISTRY];

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

    // Parse the permission to get resource and action
    const [resource, action] = permission.split(".");

    if (enabled) {
      // Add the requested permission
      newPermissions.push(permission);

      // If enabling create, update, or delete, automatically enable read permission
      if (action === CrudAction.Create || action === CrudAction.Update || action === CrudAction.Delete) {
        const readPermission = `${resource}.${CrudAction.Read}`;
        if (!newPermissions.includes(readPermission)) {
          newPermissions.push(readPermission);
        }
      }
    } else {
      // When disabling a permission, check if we need to disable related permissions
      if (action === CrudAction.Read) {
        // If disabling read, also disable create, update, and delete since they depend on read
        const dependentActions = [CrudAction.Create, CrudAction.Update, CrudAction.Delete];
        dependentActions.forEach((dependentAction) => {
          const dependentPermission = `${resource}.${dependentAction}`;
          newPermissions = newPermissions.filter((p) => p !== dependentPermission);
        });
      } else if (
        action === CrudAction.Create ||
        action === CrudAction.Update ||
        action === CrudAction.Delete
      ) {
        // If disabling create, update, or delete, just remove that specific permission
        // Read permission remains enabled
        newPermissions = newPermissions.filter((p) => p !== permission);
      } else {
        // For other actions (custom actions), just remove the specific permission
        newPermissions = newPermissions.filter((p) => p !== permission);
      }
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
