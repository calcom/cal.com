import type { FeatureState } from "@calcom/features/flags/config";

/**
 * Computes the effective enabled state based on global, org, teams, and user settings.
 *
 * Precedence rules:
 * 1. Global disabled → false (stop)
 * 2. Org explicitly disabled → false (stop)
 * 3. Org explicitly enabled → allowed at org level, continue to teams
 * 4. Org inherits (or no org) → check teams (only explicitly enabled teams count)
 * 5. All teams explicitly disabled → false (stop)
 * 6. At least one team enabled, OR inherits from an enabled org → allowed at team level, continue to user
 * 7. User explicitly disabled → false
 * 8. User explicitly enabled OR inherits → true
 *
 * Note: "inherit" all the way up the chain (global enabled, org inherit, team inherit, user inherit)
 * results in the feature being disabled. At least one level must explicitly enable the feature.
 */
export function computeEffectiveStateAcrossTeams({
  globalEnabled,
  orgState,
  teamStates,
  userState,
}: {
  globalEnabled: boolean;
  orgState: FeatureState;
  teamStates: FeatureState[];
  userState: FeatureState;
}): boolean {
  // 1. Global disabled → false
  if (!globalEnabled) {
    return false;
  }

  // 2. Org explicitly disabled → false
  if (orgState === "disabled") {
    return false;
  }

  // 3-4. Check if allowed at org level
  const orgAllows = orgState === "enabled" || orgState === "inherit";

  if (!orgAllows) {
    return false;
  }

  // 5-6. Check teams (OR logic - most permissive)
  // If no teams and org is enabled, user can proceed (inherit from org)
  // If no teams and org is inherit, user must explicitly enable
  let teamAllows = teamStates.length === 0 && orgState === "enabled";
  // Track if there's explicit enablement above the user level
  let hasExplicitEnablementAboveUser = orgState === "enabled";

  if (teamStates.length > 0) {
    // At least one team must be enabled or inherit (from enabled org)
    const hasEnabledTeam = teamStates.some((state) => state === "enabled");
    const hasInheritingTeam = teamStates.some((state) => state === "inherit");

    if (orgState === "enabled") {
      // If org is enabled, teams that inherit are effectively enabled
      teamAllows = hasEnabledTeam || hasInheritingTeam;
      hasExplicitEnablementAboveUser = true;
    } else {
      // If org is inherit/null, only explicitly enabled teams count
      teamAllows = hasEnabledTeam;
      hasExplicitEnablementAboveUser = hasEnabledTeam;
    }

    // If all teams are explicitly disabled, block
    const allTeamsDisabled = teamStates.every((state) => state === "disabled");
    if (allTeamsDisabled) {
      return false;
    }
  }

  if (!teamAllows) {
    // Special case: no teams and org inherits - user can still explicitly enable
    if (teamStates.length === 0 && orgState === "inherit" && userState === "enabled") {
      return true;
    }
    return false;
  }

  // 7-8. Check user preference
  if (userState === "disabled") {
    return false;
  }

  // If user inherits, there must be explicit enablement above them
  if (userState === "inherit" && !hasExplicitEnablementAboveUser) {
    return false;
  }

  // User enabled or inherits from allowed team/org
  return true;
}
