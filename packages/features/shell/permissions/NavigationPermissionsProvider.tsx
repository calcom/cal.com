"use client";

import React, { createContext, useContext } from "react";

import { trpc } from "@calcom/trpc/react";

import type { NavigationItemName, NavigationPermissions } from "./types";
import { DEFAULT_PERMISSIONS } from "./types";

export type { NavigationItemName, NavigationPermissions };

/**
 * Context for navigation permissions
 */
const NavigationPermissionsContext = createContext<{
  permissions: NavigationPermissions;
  isLoading: boolean;
} | null>(null);

/**
 * Hook to access navigation permissions from context
 * @returns NavigationPermissions object with boolean flags for each navigation item
 */
export function useNavigationPermissions(): { permissions: NavigationPermissions; isLoading: boolean } {
  const context = useContext(NavigationPermissionsContext);
  if (context === null) {
    return {
      permissions: DEFAULT_PERMISSIONS,
      isLoading: false,
    };
  }
  return context;
}

/**
 * Hook to check if a specific navigation item should be displayed
 * @param itemName The navigation item name to check
 * @returns boolean indicating if the item should be displayed
 */
export function useNavigationPermission(itemName: NavigationItemName): boolean {
  const { permissions } = useNavigationPermissions();
  return permissions[itemName];
}

/**
 * Provider component for navigation permissions
 * Fetches permissions client-side using tRPC
 */
export function NavigationPermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: permissions, isLoading } = trpc.viewer.pbac.getNavigationPermissions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const contextValue = {
    permissions: permissions || DEFAULT_PERMISSIONS,
    isLoading,
  };

  return (
    <NavigationPermissionsContext.Provider value={contextValue}>
      {children}
    </NavigationPermissionsContext.Provider>
  );
}
