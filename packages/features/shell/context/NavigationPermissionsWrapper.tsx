"use client";

import { NavigationPermissionsProvider, type NavigationPermissions } from "./NavigationPermissionsProvider";

interface NavigationPermissionsWrapperProps {
  permissions: NavigationPermissions;
  children: React.ReactNode;
}

export function NavigationPermissionsWrapper({ permissions, children }: NavigationPermissionsWrapperProps) {
  return <NavigationPermissionsProvider value={permissions}>{children}</NavigationPermissionsProvider>;
}
