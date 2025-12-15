import type { FeatureId, FeatureState } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { computeEffectiveStateAcrossTeams } from "./computeEffectiveState";
import { OPT_IN_FEATURES } from "./config";

type ResolvedFeatureState = {
  featureId: FeatureId;
  globalEnabled: boolean;
  orgState: FeatureState;
  teamStates: FeatureState[];
  userState: FeatureState | undefined;
  effectiveEnabled: boolean;
};

/**
 * Service class for managing feature opt-in logic.
 * Computes effective states based on global, org, team, and user settings.
 */
export class FeatureOptInService {
  constructor(private featuresRepository: FeaturesRepository) {}

  /**
   * Core method: Resolve feature states for a user across all their teams.
   *
   * Precedence rules:
   * 1. Global disabled → false (stop)
   * 2. Org explicitly disabled → false (stop)
   * 3. Org explicitly enabled → allowed at org level, continue to teams
   * 4. Org inherits (or no org) → check teams
   * 5. All teams explicitly disabled → false (stop)
   * 6. At least one team enabled OR inherits → allowed at team level, continue to user
   * 7. User explicitly disabled → false
   * 8. User explicitly enabled OR inherits → true
   */
  async resolveFeatureStatesAcrossTeams({
    userId,
    orgId,
    teamIds,
    featureIds,
  }: {
    userId: number;
    orgId: number | null;
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, ResolvedFeatureState>> {
    // Get global feature state
    const allFeatures = await this.featuresRepository.getAllFeatures();
    const globalEnabledMap = new Map(allFeatures.map((feature) => [feature.slug, feature.enabled ?? false]));

    // Get org and team states in a single query
    // Include orgId in the query if it exists
    const allTeamIds = orgId !== null ? [orgId, ...teamIds] : teamIds;
    const allTeamStates = await this.featuresRepository.getTeamsFeatureStates({
      teamIds: allTeamIds,
      featureIds,
    });

    // Get user states in a batch query
    const userStates = await this.featuresRepository.getUserFeatureStates({
      userId,
      featureIds,
    });

    const resolvedStates: Record<string, ResolvedFeatureState> = {};

    for (const featureId of featureIds) {
      const globalEnabled = globalEnabledMap.get(featureId) ?? false;
      const teamStatesById = allTeamStates[featureId] ?? {};

      // Extract org state from the combined result
      const orgState: FeatureState = orgId !== null ? teamStatesById[orgId] ?? "inherit" : "inherit";

      // Extract team states from the combined result
      const teamStates = teamIds.map((teamId) => teamStatesById[teamId] ?? "inherit");

      const userState = userStates[featureId];

      // Compute effective state
      const effectiveEnabled = computeEffectiveStateAcrossTeams({
        globalEnabled,
        orgState,
        teamStates,
        userState,
      });

      resolvedStates[featureId] = {
        featureId,
        globalEnabled,
        orgState,
        teamStates,
        userState,
        effectiveEnabled,
      };
    }

    return resolvedStates;
  }

  /**
   * List all opt-in features with their states for a user across teams.
   * Only returns features that are in the allowlist and globally enabled.
   */
  async listFeaturesForUser(input: { userId: number; orgId: number | null; teamIds: number[] }) {
    const { userId, orgId, teamIds } = input;
    const featureIds = OPT_IN_FEATURES.map((config) => config.slug);

    const resolvedStates = await this.resolveFeatureStatesAcrossTeams({
      userId,
      orgId,
      teamIds,
      featureIds,
    });

    return featureIds.map((featureId) => resolvedStates[featureId]).filter((state) => state.globalEnabled);
  }

  /**
   * List all opt-in features with their raw states for a team.
   * Used for team admin settings page to configure feature opt-in.
   * Only returns features that are in the allowlist and globally enabled.
   */
  async listFeaturesForTeam(input: { teamId: number }) {
    const { teamId } = input;

    const allFeatures = await this.featuresRepository.getAllFeatures();

    // Get all team feature states in a single query
    const teamStates = await this.featuresRepository.getTeamsFeatureStates({
      teamIds: [teamId],
      featureIds: OPT_IN_FEATURES.map((config) => config.slug),
    });

    const results = OPT_IN_FEATURES.map((config) => {
      const globalFeature = allFeatures.find((f) => f.slug === config.slug);
      const globalEnabled = globalFeature?.enabled ?? false;
      const teamState = teamStates[config.slug]?.[teamId] ?? "inherit";

      return {
        featureId: config.slug,
        globalEnabled,
        teamState,
      };
    });

    return results.filter((result) => result.globalEnabled);
  }

  /**
   * Set user's feature state.
   * Delegates to FeaturesRepository.setUserFeatureState.
   */
  async setUserFeatureState(input: {
    userId: number;
    featureId: FeatureId;
    state: FeatureState;
    assignedBy: number;
  }) {
    const { userId, featureId, state, assignedBy } = input;
    await this.featuresRepository.setUserFeatureState(userId, featureId, state, `user-${assignedBy}`);
  }

  /**
   * Set team's feature state.
   * Delegates to FeaturesRepository.setTeamFeatureState.
   */
  async setTeamFeatureState(input: {
    teamId: number;
    featureId: FeatureId;
    state: FeatureState;
    assignedBy: number;
  }) {
    const { teamId, featureId, state, assignedBy } = input;
    await this.featuresRepository.setTeamFeatureState(teamId, featureId, state, `user-${assignedBy}`);
  }
}
