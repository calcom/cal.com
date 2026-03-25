import {
  CrudAction,
  type CustomAction,
  PERMISSION_REGISTRY,
  Scope,
  getPermissionsForScope,
} from "../domain/types/permission-registry";

/**
 * Helper function to split permission string into resource and action
 * Handles dotted resource names like "organization.attributes.read"
 * @param permission Permission string (e.g., "organization.attributes.read")
 * @returns Object with resource and action parts
 */
const splitPermission = (permission: string): { resource: string; action: string } => {
  const lastDotIndex = permission.lastIndexOf(".");
  if (lastDotIndex === -1) {
    throw new Error(`Invalid permission format: ${permission}`);
  }

  const resource = permission.substring(0, lastDotIndex);
  const action = permission.substring(lastDotIndex + 1);

  return { resource, action };
};

/**
 * Generic permission graph traversal function using BFS
 * @param startPermission The permission to start traversal from
 * @param direction Whether to find dependencies or dependents
 * @param scope The scope to use for permission registry (defaults to Organization)
 * @returns Array of related permissions (excluding the start permission itself)
 */
export const traversePermissions = (
  startPermission: string,
  direction: "dependencies" | "dependents",
  scope: Scope = Scope.Organization
): string[] => {
  const visited = new Set<string>();
  const result = new Set<string>();
  const queue: string[] = [startPermission];
  const registry = getPermissionsForScope(scope);

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
      const { resource, action } = splitPermission(currentPermission);
      const resourceConfig = registry[resource as keyof typeof registry];

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
      Object.entries(registry).forEach(([resource, config]) => {
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
          const { resource: currentResource, action: currentAction } = splitPermission(currentPermission);
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
 * @param scope The scope to use for permission registry (defaults to Organization)
 * @returns Array of dependency permissions
 */
export const getTransitiveDependencies = (
  permission: string,
  scope: Scope = Scope.Organization
): string[] => {
  return traversePermissions(permission, "dependencies", scope);
};

/**
 * Get all permissions that transitively depend on the given permission
 * @param permission The permission to find dependents for
 * @param scope The scope to use for permission registry (defaults to Organization)
 * @returns Array of dependent permissions
 */
export const getTransitiveDependents = (permission: string, scope: Scope = Scope.Organization): string[] => {
  return traversePermissions(permission, "dependents", scope);
};
