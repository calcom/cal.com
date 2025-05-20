import { usePermissionStore } from "../store/permission-store";
import type { PermissionString } from "../types/permission-registry";

export function usePermission(teamId: number, permission: PermissionString) {
  const hasPermission = usePermissionStore((state) => state.hasPermission(teamId, permission));
  const teamPermissions = usePermissionStore((state) => state.teamPermissions);
  const isLoading = !teamPermissions.has(teamId);

  return {
    hasPermission,
    isLoading,
  };
}

export function usePermissions(teamId: number, permissions: PermissionString[]) {
  const hasPermissions = usePermissionStore((state) => state.hasPermissions(teamId, permissions));
  const teamPermissions = usePermissionStore((state) => state.teamPermissions);
  const isLoading = !teamPermissions.has(teamId);

  return {
    hasPermissions,
    isLoading,
  };
}
