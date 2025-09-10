"use client";

import React, { createContext, useContext } from "react";

import type { NavigationItemName, NavigationPermissions } from "./types";

/**
 * Context for navigation permissions
 */
const NavigationPermissionsContext = createContext<NavigationPermissions | null>(null);

/**
 * Hook to access navigation permissions from context
 * @returns NavigationPermissions object with boolean flags for each navigation item
 * @throws Error if used outside of NavigationPermissionsProvider
 */
export function useNavigationPermissions(): NavigationPermissions {
  const context = useContext(NavigationPermissionsContext);
  if (context === null) {
    return {
      insights: true,
      workflows: true,
      routing: true,
      teams: true,
      members: true,
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
  const permissions = useNavigationPermissions();
  return permissions[itemName];
}

/**
 * Provider component for navigation permissions
 * Wraps components that need access to navigation permissions
 */
export function NavigationPermissionsProvider({
  value,
  children,
}: {
  value: NavigationPermissions;
  children: React.ReactNode;
}) {
  return (
    <NavigationPermissionsContext.Provider value={value}>{children}</NavigationPermissionsContext.Provider>
  );
}
