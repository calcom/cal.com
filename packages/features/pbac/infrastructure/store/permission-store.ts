import { create } from "zustand";
import type { PermissionString } from "../../domain/types/permission-registry";

export interface TeamPermissions {
  roleId: string;
  permissions: Set<PermissionString>;
}

interface PermissionStore {
  teamPermissions: Map<number, TeamPermissions>;
  setTeamPermissions: (
    permissions: Record<number, { roleId: string; permissions: PermissionString[] }>
  ) => void;
  hasPermission: (teamId: number, permission: PermissionString) => boolean;
  hasPermissions: (teamId: number, permissions: PermissionString[]) => boolean;
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  teamPermissions: new Map(),
  setTeamPermissions: (permissions) => {
    const permissionsMap = new Map();
    Object.entries(permissions).forEach(([teamId, { roleId, permissions: perms }]) => {
      permissionsMap.set(Number(teamId), {
        roleId,
        permissions: new Set(perms),
      });
    });
    set({ teamPermissions: permissionsMap });
  },
  hasPermission: (teamId, permission) => {
    const teamPerms = get().teamPermissions.get(teamId);
    if (!teamPerms) return false;
    return teamPerms.permissions.has(permission);
  },
  hasPermissions: (teamId, permissions) => {
    const teamPerms = get().teamPermissions.get(teamId);
    if (!teamPerms) return false;
    return permissions.every((p) => teamPerms.permissions.has(p));
  },
}));
