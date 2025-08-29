import { CrudAction, type CustomAction, PERMISSION_REGISTRY } from "../domain/types/permission-registry";

/**
 * Generic permission graph traversal function using BFS
 * @param startPermission The permission to start traversal from
 * @param direction Whether to find dependencies or dependents
 * @returns Array of related permissions (excluding the start permission itself)
 */
export const traversePermissions = (
  startPermission: string,
  direction: "dependencies" | "dependents"
): string[] => {
  const visited = new Set<string>();
  const result = new Set<string>();
  const queue: string[] = [startPermission];

  while (queue.length > 0) {
    const currentPermission = queue.shift();
    if (!currentPermission) {
      break;
    }

    if (visited.has(currentPermission)) {
      continue;
    }
    visited.add(currentPermission);

    if (direction === "dependencies") {
      // Find what the current permission depends on
      const [resource, action] = currentPermission.split(".");
      const resourceConfig = PERMISSION_REGISTRY[resource as keyof typeof PERMISSION_REGISTRY];

      if (resourceConfig && resourceConfig[action as CrudAction | CustomAction]) {
        const permissionDetails = resourceConfig[action as CrudAction | CustomAction];
        if (permissionDetails?.dependsOn) {
          permissionDetails.dependsOn.forEach((dependency: string) => {
            if (!visited.has(dependency)) {
              result.add(dependency);
              queue.push(dependency);
            }
          });
        }
      }

      // Backward compatibility: add read dependency for CRUD operations
      if (action === CrudAction.Create || action === CrudAction.Update || action === CrudAction.Delete) {
        const readPermission = `${resource}.${CrudAction.Read}`;
        if (!visited.has(readPermission)) {
          result.add(readPermission);
          queue.push(readPermission);
        }
      }
    } else {
      // Find what depends on the current permission
      Object.entries(PERMISSION_REGISTRY).forEach(([resource, config]) => {
        Object.entries(config).forEach(([action, details]) => {
          if (action.startsWith("_")) return; // Skip internal keys

          const permissionDetails = details as any;
          const candidatePermission = `${resource}.${action}`;

          // Check explicit dependencies
          if (permissionDetails?.dependsOn?.includes(currentPermission)) {
            if (!visited.has(candidatePermission)) {
              result.add(candidatePermission);
              queue.push(candidatePermission);
            }
          }

          // Backward compatibility: check CRUD dependencies on read
          const [currentResource, currentAction] = currentPermission.split(".");
          if (
            currentAction === CrudAction.Read &&
            resource === currentResource &&
            (action === CrudAction.Create || action === CrudAction.Update || action === CrudAction.Delete)
          ) {
            if (!visited.has(candidatePermission)) {
              result.add(candidatePermission);
              queue.push(candidatePermission);
            }
          }
        });
      });
    }
  }

  return Array.from(result);
};

/**
 * Get all permissions that the given permission transitively depends on
 * @param permission The permission to find dependencies for
 * @returns Array of dependency permissions
 */
export const getTransitiveDependencies = (permission: string): string[] => {
  return traversePermissions(permission, "dependencies");
};

/**
 * Get all permissions that transitively depend on the given permission
 * @param permission The permission to find dependents for
 * @returns Array of dependent permissions
 */
export const getTransitiveDependents = (permission: string): string[] => {
  return traversePermissions(permission, "dependents");
};
