"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export interface SettingsPermissions {
  canViewRoles?: boolean;
  canViewOrganizationBilling?: boolean;
  canUpdateOrganization?: boolean;
  canViewAttributes?: boolean;
}

const SettingsPermissionsContext = createContext<SettingsPermissions | null>(null);

export function SettingsPermissionsProvider({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: SettingsPermissions;
}) {
  return (
    <SettingsPermissionsContext.Provider value={permissions}>{children}</SettingsPermissionsContext.Provider>
  );
}

export function useSettingsPermissions(): SettingsPermissions {
  const context = useContext(SettingsPermissionsContext);
  if (context === null) {
    throw new Error("useSettingsPermissions must be used within SettingsPermissionsProvider");
  }
  return context;
}
