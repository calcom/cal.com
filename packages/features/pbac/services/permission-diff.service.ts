import type { RolePermission } from "../domain/models/Role";
import {
  parsePermissionString,
  isValidPermissionString,
  type PermissionString,
  type ParsedPermission,
} from "../domain/types/permission-registry";

export class PermissionDiffService {
  private filterInternalPermissions(permissions: PermissionString[]): PermissionString[] {
    return permissions.filter((permission) => {
      // Skip invalid permissions entirely
      if (!isValidPermissionString(permission)) {
        return false;
      }
      const { action } = parsePermissionString(permission);
      return action !== "_resource";
    });
  }

  private createPermissionKey(permission: ParsedPermission): string {
    return `${permission.resource}:${permission.action}`;
  }

  calculateDiff(newPermissions: PermissionString[], existingPermissions: RolePermission[]) {
    const filteredPermissions = this.filterInternalPermissions(newPermissions);

    // Create sets for comparison
    const existingSet = new Set(existingPermissions.map((p) => this.createPermissionKey(p)));

    const newSet = new Set(
      filteredPermissions.map((p) => {
        const parsed = parsePermissionString(p);
        return this.createPermissionKey(parsed);
      })
    );

    // Calculate permissions to add and remove
    const toAdd = filteredPermissions
      .map((p) => parsePermissionString(p))
      .filter((p) => !existingSet.has(this.createPermissionKey(p)));

    const toRemove = existingPermissions.filter((p) => !newSet.has(this.createPermissionKey(p)));

    return {
      toAdd,
      toRemove,
    };
  }
}
