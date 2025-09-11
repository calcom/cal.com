/**
 * Centralized navigation item configuration
 * Single source of truth for navigation items that require permissions
 */
export const NAVIGATION_ITEMS_CONFIG = {
  insights: {
    permission: "insights.read",
    href: "/insights",
    icon: "chart-bar",
  },
  workflows: {
    permission: "workflow.read",
    href: "/workflows",
    icon: "zap",
  },
  routing: {
    permission: "routingForm.read",
    href: "/routing",
    icon: "split",
  },
  teams: {
    permission: "team.read",
    href: "/teams",
    icon: "users",
  },
  members: {
    permission: "organization.listMembers",
    href: "/settings/organizations",
    icon: "building",
  },
} as const;

/**
 * Navigation permission mapping for menu items
 * Auto-generated from NAVIGATION_ITEMS_CONFIG
 */
export const NAVIGATION_PERMISSION_MAP = Object.fromEntries(
  Object.entries(NAVIGATION_ITEMS_CONFIG).map(([key, config]) => [key, config.permission])
) as Record<keyof typeof NAVIGATION_ITEMS_CONFIG, string>;

export type NavigationItemName = keyof typeof NAVIGATION_ITEMS_CONFIG;

/**
 * Navigation permissions object containing boolean flags for each navigation item
 * Auto-generated from NAVIGATION_ITEMS_CONFIG
 */
export type NavigationPermissions = Record<NavigationItemName, boolean>;
