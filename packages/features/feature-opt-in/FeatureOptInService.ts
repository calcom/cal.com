import type { AppFlags } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { computeEffectiveStateAcrossTeams } from "./computeEffectiveState";
import { OPT_IN_FEATURES } from "./config";
import type { FeatureState } from "./types";

/**
 * Service class for managing feature opt-in logic.
 * Computes effective states based on global, org, team, and user settings.
 */
export class FeatureOptInService {
  constructor(private featuresRepository: FeaturesRepository) {}

  /**
   * Core method: Resolve feature state for a user across all their teams.
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
  async resolveFeatureStateAcrossTeams({
    userId,
    orgId,
    teamIds,
    featureId,
  }: {
    userId: number;
    orgId: number | null;
    teamIds: number[];
    featureId: keyof AppFlags;
  }) {
    // Get global feature state
    const allFeatures = await this.featuresRepository.getAllFeatures();
    const globalFeature = allFeatures.find((f) => f.slug === featureId);
    const globalEnabled = globalFeature?.enabled ?? false;

    // Get org state - use batch method with single feature
    let orgState: FeatureState = "inherit";
    if (orgId !== null) {
      const orgStates = await this.featuresRepository.getTeamFeatureStates({
        teamId: orgId,
        featureIds: [featureId],
      });
      orgState = orgStates[featureId];
    }

    // Get team states - query all teams for the single feature in one call
    const teamStatesByTeam = await this.featuresRepository.getFeatureStateForTeams({
      teamIds,
      featureId,
    });
    const teamStates = teamIds.map((teamId) => teamStatesByTeam[teamId] ?? "inherit");

    // Get user state - use batch method with single feature
    const userStates = await this.featuresRepository.getUserFeatureStates({
      userId,
      featureIds: [featureId],
    });
    const userState = userStates[featureId];

    // Compute effective state
    const effectiveEnabled = computeEffectiveStateAcrossTeams({
      globalEnabled,
      orgState,
      teamStates,
      userState,
    });

    return {
      globalEnabled,
      orgState,
      teamStates,
      userState,
      effectiveEnabled,
    };
  }

  /**
   * List all opt-in features with their states for a user across teams.
   * Only returns features that are in the allowlist and globally enabled.
   */
  async listFeaturesForUser(input: { userId: number; orgId: number | null; teamIds: number[] }) {
    const { userId, orgId, teamIds } = input;

    const results = await Promise.all(
      OPT_IN_FEATURES.map(async (config) => ({
        slug: config.slug,
        ...(await this.resolveFeatureStateAcrossTeams({ userId, orgId, teamIds, featureId: config.slug })),
      }))
    );

    return results.filter((item) => item.globalEnabled);
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
    const featureIds = OPT_IN_FEATURES.map((config) => config.slug);
    const teamStates = await this.featuresRepository.getTeamFeatureStates({
      teamId,
      featureIds,
    });

    const results = OPT_IN_FEATURES.map((config) => {
      const globalFeature = allFeatures.find((f) => f.slug === config.slug);
      const globalEnabled = globalFeature?.enabled ?? false;
      const teamState = teamStates[config.slug];

      return {
        slug: config.slug,
        globalEnabled,
        teamState,
      };
    });

    return results.filter((item) => item.globalEnabled);
  }

  /**
   * Set user's feature state.
   * Delegates to FeaturesRepository.setUserFeatureState.
   */
  async setUserFeatureState(input: {
    userId: number;
    featureId: keyof AppFlags;
    state: FeatureState;
    assignedBy: number;
  }) {
    const { userId, featureId, state, assignedBy } = input;
    await this.featuresRepository.setUserFeatureState(userId, featureId, state, String(assignedBy));
  }

  /**
   * Set team's feature state.
   * Delegates to FeaturesRepository.setTeamFeatureState.
   */
  async setTeamFeatureState(input: {
    teamId: number;
    featureId: string;
    state: FeatureState;
    assignedBy: number;
  }) {
    const { teamId, featureId, state, assignedBy } = input;
    await this.featuresRepository.setTeamFeatureState(
      teamId,
      featureId as keyof AppFlags,
      state,
      String(assignedBy)
    );
  }
}
