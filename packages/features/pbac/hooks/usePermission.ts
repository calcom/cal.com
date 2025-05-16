import { trpc } from "@calcom/trpc";

import type { PermissionString } from "../types/permission-registry";

export function usePermission(teamId: number, permission: PermissionString) {
  const { data: hasPermission, isLoading } = trpc.viewer.pbac.checkPermission.useQuery(
    {
      teamId,
      permission,
    },
    {
      // Since permissions don't change often, we can cache them for a while
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  return {
    hasPermission: hasPermission ?? false,
    isLoading,
  };
}

export function usePermissions(teamId: number, permissions: PermissionString[]) {
  const { data: hasPermissions, isLoading } = trpc.viewer.pbac.checkPermissions.useQuery(
    {
      teamId,
      permissions,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  return {
    hasPermissions: hasPermissions ?? false,
    isLoading,
  };
}
