/**
 * Navigation permission mapping for menu items
 */
export const NAVIGATION_PERMISSION_MAP = {
  members: "organization.listMembers",
  teams: "team.read",
  insights: "insights.read",
} as const;

export const DEFAULT_PERMISSIONS = Object.fromEntries(
  Object.keys(NAVIGATION_PERMISSION_MAP).map((key) => [key, true])
) as NavigationPermissions;

export type NavigationItemName = keyof typeof NAVIGATION_PERMISSION_MAP;

/**
 * Navigation permissions object containing boolean flags for each navigation item
 */
export type NavigationPermissions = Record<NavigationItemName, boolean>;
