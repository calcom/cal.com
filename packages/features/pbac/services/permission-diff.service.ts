import type { RolePermission } from "../domain/models/Role";

export type PermissionString = string;
export type ParsedPermission = { resource: string; action: string };

export class PermissionDiffService {
  private parsePermission(permission: PermissionString): ParsedPermission {
    const [resource, action] = permission.split(".");
    return { resource, action };
  }

  private filterInternalPermissions(permissions: PermissionString[]): PermissionString[] {
    return permissions.filter((permission) => {
      const { action } = this.parsePermission(permission);
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
        const parsed = this.parsePermission(p);
        return this.createPermissionKey(parsed);
      })
    );

    // Calculate permissions to add and remove
    const toAdd = filteredPermissions
      .map((p) => this.parsePermission(p))
      .filter((p) => !existingSet.has(this.createPermissionKey(p)));

    const toRemove = existingPermissions.filter((p) => !newSet.has(this.createPermissionKey(p)));

    return {
      toAdd,
      toRemove,
    };
  }
}
