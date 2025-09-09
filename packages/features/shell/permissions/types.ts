/**
 * Navigation permission mapping for menu items
 * Maps navigation item names to their corresponding PBAC permissions
 */
export const NAVIGATION_PERMISSION_MAP = {
  insights: "insights.read",
  workflows: "workflow.read",
  routing: "routingForm.read",
  teams: "team.read",
  members: "organization.listMembers",
} as const;

export type NavigationItemName = keyof typeof NAVIGATION_PERMISSION_MAP;

/**
 * Navigation permissions object containing boolean flags for each navigation item
 */
export interface NavigationPermissions {
  insights: boolean;
  workflows: boolean;
  routing: boolean;
  teams: boolean;
  members: boolean;
}
