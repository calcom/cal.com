"use client";

import React, { createContext, useContext } from "react";

import { trpc } from "@calcom/trpc/react";

import type { NavigationItemName, NavigationPermissions } from "./types";
import { NAVIGATION_ITEMS_CONFIG } from "./types";

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
    const defaultPermissions = Object.fromEntries(
      Object.keys(NAVIGATION_ITEMS_CONFIG).map((key) => [key, true])
    ) as NavigationPermissions;

    return {
      permissions: defaultPermissions,
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

  const defaultPermissions = Object.fromEntries(
    Object.keys(NAVIGATION_ITEMS_CONFIG).map((key) => [key, true])
  ) as NavigationPermissions;

  const contextValue = {
    permissions: permissions || defaultPermissions,
    isLoading,
  };

  return (
    <NavigationPermissionsContext.Provider value={contextValue}>
      {children}
    </NavigationPermissionsContext.Provider>
  );
}
