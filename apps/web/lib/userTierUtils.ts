/**
 * Utility functions for determining a user's tier based on their team memberships.
 *
 * Tier determination rules:
 * - Free users: Users with no team memberships
 * - Teams users: Users who belong to at least one team (but not an enterprise/organization)
 * - Enterprise users: Users who belong to an organization (identified by either having
 *   organizationSettings or isOrganization: true in metadata)
 */

export type UserTier = "free" | "teams" | "enterprise";

export type TeamMembership = {
  team: {
    metadata: Record<string, any>;
    parentId: string | null;
    organizationSettings: { id: string } | null;
  };
};

export type SimplifiedTeam = {
  metadata?: Record<string, any>;
  parentId?: string | null;
  organizationSettings?: { id: string } | null;
  isOrganization?: boolean;
};

/**
 * Determines a user's tier based on their team memberships
 *
 * @param teamMemberships - Array of team memberships for the user
 * @returns The user's tier: "free", "teams", or "enterprise"
 */
export function determineUserTier(teamMemberships: TeamMembership[]): UserTier {
  if (!teamMemberships.length) {
    console.log("No team memberships found, returning 'free' tier");
    return "free";
  }

  console.log("Team memberships for tier determination:", JSON.stringify(teamMemberships, null, 2));

  // Check if any team has an entry in OrganizationSettings or isOrganization: true in metadata
  const isEnterprise = teamMemberships.some((membership) => {
    const hasOrgSettings = membership.team.organizationSettings !== null;
    const hasIsOrgInMetadata =
      (membership.team.metadata as { isOrganization?: boolean })?.isOrganization === true;

    console.log("Team membership check:", {
      hasOrgSettings,
      hasIsOrgInMetadata,
      metadata: membership.team.metadata,
      organizationSettings: membership.team.organizationSettings,
    });

    return hasOrgSettings || hasIsOrgInMetadata;
  });

  if (isEnterprise) {
    console.log("Enterprise tier detected");
    return "enterprise";
  } else if (teamMemberships.some((membership) => !membership.team.parentId)) {
    console.log("Teams tier detected");
    return "teams";
  } else {
    console.log("Teams tier detected (sub-team)");
    return "teams";
  }
}

/**
 * Helper function to check a user's tier based on a simplified team structure
 *
 * @param teams - Array of simplified team objects
 * @returns The user's tier: "free", "teams", or "enterprise"
 */
export function getUserTierFromTeams(teams: SimplifiedTeam[]): UserTier {
  console.log("Original simplified teams:", JSON.stringify(teams, null, 2));

  // Convert the simplified team structure to the format expected by determineUserTier
  const teamMemberships = teams.map((team) => {
    // Check if isOrganization is directly on the team object
    const isOrgDirectlyOnTeam = team.isOrganization === true;

    // Create the metadata object correctly
    const metadata = team.metadata || {};
    if (isOrgDirectlyOnTeam && !metadata.isOrganization) {
      console.log("Found isOrganization directly on team object, moving it to metadata");
      metadata.isOrganization = true;
    }

    return {
      team: {
        metadata: metadata,
        parentId: team.parentId || null,
        organizationSettings: team.organizationSettings || null,
      },
    };
  });

  console.log("Converted team memberships:", JSON.stringify(teamMemberships, null, 2));

  return determineUserTier(teamMemberships);
}

/**
 * Checks if a user is on the free tier
 *
 * @param teams - Array of simplified team objects
 * @returns True if the user is on the free tier
 */
export function isFreeTier(teams: SimplifiedTeam[]): boolean {
  return getUserTierFromTeams(teams) === "free";
}

/**
 * Checks if a user is on the teams tier
 *
 * @param teams - Array of simplified team objects
 * @returns True if the user is on the teams tier
 */
export function isTeamsTier(teams: SimplifiedTeam[]): boolean {
  return getUserTierFromTeams(teams) === "teams";
}

/**
 * Checks if a user is on the enterprise tier
 *
 * @param teams - Array of simplified team objects
 * @returns True if the user is on the enterprise tier
 */
export function isEnterpriseTier(teams: SimplifiedTeam[]): boolean {
  return getUserTierFromTeams(teams) === "enterprise";
}
