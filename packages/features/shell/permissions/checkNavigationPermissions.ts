import { unstable_cache } from "next/cache";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

import type { NavigationPermissions } from "./types";
import { NAVIGATION_PERMISSION_MAP } from "./types";

/**
 * Server-side function to check all navigation permissions for a user
 * Uses caching for performance optimization
 */
export const checkNavigationPermissions = unstable_cache(
  async (userId: number, _organizationId: number | null): Promise<NavigationPermissions> => {
    const permissionService = new PermissionCheckService();

    const teamIds = await MembershipRepository.findUserTeamIds({ userId });

    if (teamIds.length === 0) {
      return {
        insights: true,
        workflows: true,
        routing: true,
        teams: true,
        members: true,
      };
    }

    const permissionChecks = await Promise.all([
      permissionService.getTeamIdsWithPermission(userId, NAVIGATION_PERMISSION_MAP.insights),
      permissionService.getTeamIdsWithPermission(userId, NAVIGATION_PERMISSION_MAP.workflows),
      permissionService.getTeamIdsWithPermission(userId, NAVIGATION_PERMISSION_MAP.routing),
      permissionService.getTeamIdsWithPermission(userId, NAVIGATION_PERMISSION_MAP.teams),
      permissionService.getTeamIdsWithPermission(userId, NAVIGATION_PERMISSION_MAP.members),
    ]);

    const [insightsTeams, workflowsTeams, routingTeams, teamsTeams, membersTeams] = permissionChecks;

    const navigationPermissions: NavigationPermissions = {
      insights: insightsTeams.length > 0,
      workflows: workflowsTeams.length > 0,
      routing: routingTeams.length > 0,
      teams: teamsTeams.length > 0,
      members: membersTeams.length > 0,
    };

    return navigationPermissions;
  },
  ["navigation-permissions"],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ["navigation-permissions"],
  }
);
