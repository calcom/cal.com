import type { AppFlags } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { OPT_IN_FEATURES } from "./config";
import type { FeatureState } from "./types";

function computeEffectiveState(globalEnabled: boolean, teamState: FeatureState, userState: FeatureState) {
  if (!globalEnabled || teamState === "disabled") {
    return false;
  }
  if (userState === "enabled") {
    return true;
  } else if (userState === "disabled") {
    return false;
  } else if (userState === "inherit") {
    return teamState === "enabled"; // enabled only if team is explicitly enabled
  }

  return false;
}

/**
 * Service class for managing feature opt-in logic.
 * Computes effective states based on global, team, and user settings.
 */
export class FeatureOptInService {
  constructor(private featuresRepository: FeaturesRepository) {}

  /**
   * Get feature status for a user including effective state computation.
   *
   * Precedence rules:
   * - Global disabled → effectiveEnabled = false
   * - Team explicitly disabled (enabled=false) → effectiveEnabled = false
   * - User explicitly enabled → effectiveEnabled = true
   * - User inherits → use team state (enabled or inherit)
   */
  async getFeatureStatusForUser({
    userId,
    teamId,
    featureId,
  }: {
    userId: number;
    teamId: number | null;
    featureId: keyof AppFlags;
  }) {
    // Get global feature state (uses cached getAllFeatures from FeaturesRepository)
    const allFeatures = await this.featuresRepository.getAllFeatures();
    const globalFeature = allFeatures.find((f) => f.slug === featureId);
    const globalEnabled = globalFeature?.enabled ?? false;

    // Get user state
    const userState = await this.featuresRepository.getUserFeatureState({ userId, featureId });

    // Get team state
    let teamState: FeatureState = "inherit";
    if (teamId !== null) {
      teamState = await this.featuresRepository.getTeamFeatureState({ teamId, featureId });
    }
    const effectiveEnabled = computeEffectiveState(globalEnabled, userState, teamState);

    return {
      globalEnabled,
      userState,
      teamState,
      effectiveEnabled,
    };
  }

  /**
   * List all opt-in features with their states for a user.
   * Only returns features that are in the allowlist.
   */
  async listFeaturesForUser(input: { userId: number; teamId: number | null }) {
    const { userId, teamId } = input;

    return (
      await Promise.all(
        OPT_IN_FEATURES.map((config) =>
          this.getFeatureStatusForUser({ userId, teamId, featureId: config.slug })
        )
      )
    ).filter((item) => item.globalEnabled);
  }

  /**
   * Get feature status for a team (without user-level override).
   */
  async getFeatureStatusForTeam(input: { teamId: number; featureId: keyof AppFlags }) {
    const { teamId, featureId } = input;

    // Get global feature state (uses cached getAllFeatures from FeaturesRepository)
    const allFeatures = await this.featuresRepository.getAllFeatures();
    const globalFeature = allFeatures.find((f) => f.slug === featureId);
    const globalEnabled = globalFeature?.enabled ?? false;

    // Get team state
    const teamState = await this.featuresRepository.getTeamFeatureState({ teamId, featureId });

    // Compute effective enabled: global must be enabled and team must be explicitly enabled
    const effectiveEnabled = globalEnabled && teamState === "enabled";

    return {
      globalEnabled,
      teamState,
      effectiveEnabled,
    };
  }

  /**
   * List all opt-in features with their states for a team.
   * Only returns features that are in the allowlist.
   */
  async listFeaturesForTeam({ teamId }: { teamId: number }) {
    return (
      await Promise.all(
        OPT_IN_FEATURES.map((config) => this.getFeatureStatusForTeam({ teamId, featureId: config.slug }))
      )
    ).filter((item) => item.globalEnabled);
  }

  /**
   * Set user's feature state.
   * Delegates to FeaturesRepository.setUserFeatureState.
   */
  async setUserFeatureState(input: {
    userId: number;
    featureId: string;
    state: FeatureState;
    assignedBy: number;
  }) {
    const { userId, featureId, state, assignedBy } = input;
    await this.featuresRepository.setUserFeatureState(
      userId,
      featureId as keyof AppFlags,
      state,
      String(assignedBy)
    );
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
