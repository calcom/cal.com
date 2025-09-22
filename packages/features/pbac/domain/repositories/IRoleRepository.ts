import type { Role, CreateRoleData, RolePermission, PermissionChange } from "../models/Role";

export interface IRoleRepository {
  findByName(name: string, teamId?: number): Promise<Role | null>;
  findById(id: string): Promise<Role | null>;
  findByTeamId(teamId: number): Promise<Role[]>;
  roleBelongsToTeam(roleId: string, teamId: number): Promise<boolean>;
  create(data: CreateRoleData): Promise<Role>;
  delete(id: string): Promise<void>;
  update(
    roleId: string,
    permissionChanges: {
      toAdd: PermissionChange[];
      toRemove: PermissionChange[];
    },
    updates?: {
      color?: string;
      name?: string;
      description?: string;
    }
  ): Promise<Role>;
  getPermissions(roleId: string): Promise<RolePermission[]>;
  reassignUsersToRole(fromRoleId: string, toRoleId: string): Promise<void>;
}
