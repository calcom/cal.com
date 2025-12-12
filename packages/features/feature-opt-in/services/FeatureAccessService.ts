import type { AppFlags } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import {
  getOptInFeatureConfig,
  isFeatureInOptInAllowlist,
  getOptInFeatureSlugs,
} from "../config/feature-opt-in.config";
import type { FeatureOptInRepository } from "../repositories/FeatureOptInRepository";
import type { FeatureState } from "../types";

/**
 * Feature status with tri-state semantics.
 * - userState/teamState: "enabled" | "disabled" | "inherit"
 * - effectiveEnabled: computed boolean based on precedence rules
 * - teamExplicitlyDisabled: true if team has blocked the feature (enabled=false)
 */
export interface FeatureWithStatus {
  slug: string;
  globallyEnabled: boolean;
  userState: FeatureState;
  teamState: FeatureState;
  effectiveEnabled: boolean;
  teamExplicitlyDisabled: boolean;
  description: string | null;
  type: string;
}

export interface EligibleOptInFeature {
  slug: string;
  titleI18nKey: string;
  descriptionI18nKey: string;
  learnMoreUrl?: string;
}

/**
 * Service for managing feature access and opt-in/opt-out functionality.
 * This service orchestrates feature access checks by combining:
 * - Core feature flag checks (FeaturesRepository)
 * - Opt-in specific data (FeatureOptInRepository)
 * - Auto opt-in logic
 */
export class FeatureAccessService {
  constructor(
    private featuresRepository: FeaturesRepository,
    private featureOptInRepository: FeatureOptInRepository
  ) {}

  /**
   * Helper to convert a feature record to FeatureState.
   * - Row with enabled=true → "enabled"
   * - Row with enabled=false → "disabled"
   * - No row → "inherit"
   */
  private getFeatureState(featureRecord: { enabled: boolean } | null | undefined): FeatureState {
    if (!featureRecord) return "inherit";
    return featureRecord.enabled ? "enabled" : "disabled";
  }

  /**
   * Compute the effective enabled status based on precedence rules.
   * Precedence: Global → Team (can block) → User
   * - If globally disabled → false
   * - If team explicitly disabled (enabled=false) → false (blocks user override)
   * - If user explicitly enabled → true
   * - If user explicitly disabled → false
   * - If user inherits → use team state
   * - If team inherits → use global state
   */
  private computeEffectiveEnabled(
    globallyEnabled: boolean,
    teamState: FeatureState,
    userState: FeatureState,
    teamExplicitlyDisabled: boolean
  ): boolean {
    // Global takes precedence
    if (!globallyEnabled) return false;

    // Team can block the feature for all users
    if (teamExplicitlyDisabled) return false;

    // User explicit state takes precedence over inheritance
    if (userState === "enabled") return true;
    if (userState === "disabled") return false;

    // User inherits from team
    if (teamState === "enabled") return true;
    if (teamState === "disabled") return false;

    // Both inherit → use global state
    return globallyEnabled;
  }

  /**
   * Checks if a specific user has access to a feature.
   * This is the main orchestration method that combines:
   * 1. User's explicit feature setting
   * 2. Team-based feature access (including hierarchy)
   * 3. Auto opt-in for features in the allowlist
   *
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user has access to the feature
   */
  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    // First check user's explicit setting
    const userFeature = await this.featureOptInRepository.getUserFeature(userId, slug);
    if (userFeature) {
      return userFeature.enabled;
    }

    // Check team-based feature access (this includes hierarchy traversal)
    const hasTeamFeature = await this.featuresRepository.checkIfUserHasFeature(userId, slug);
    if (hasTeamFeature) return true;

    // Check auto opt-in for features in the OPT_IN_FEATURES allowlist
    if (isFeatureInOptInAllowlist(slug)) {
      const hasAutoOptIn = await this.featureOptInRepository.checkIfUserOrTeamHasAutoOptIn(userId);
      if (hasAutoOptIn) return true;
    }

    return false;
  }

  /**
   * Checks if a specific user has access to a feature, ignoring hierarchical (parent) teams.
   * Only checks direct user assignments and direct team memberships.
   *
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user has direct access to the feature
   */
  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    // First check user's explicit setting
    const userFeature = await this.featureOptInRepository.getUserFeature(userId, slug);
    if (userFeature) {
      return userFeature.enabled;
    }

    // Check team-based feature access (non-hierarchical)
    const hasTeamFeature = await this.featuresRepository.checkIfUserHasFeatureNonHierarchical(userId, slug);
    if (hasTeamFeature) return true;

    // Check auto opt-in for features in the OPT_IN_FEATURES allowlist
    if (isFeatureInOptInAllowlist(slug)) {
      const hasAutoOptIn = await this.featureOptInRepository.checkIfUserOrTeamHasAutoOptIn(userId);
      if (hasAutoOptIn) return true;
    }

    return false;
  }

  /**
   * Checks if a team has access to a specific feature.
   * Includes hierarchy traversal and auto opt-in checks.
   *
   * @param teamId - The ID of the team to check
   * @param featureId - The feature identifier to check
   * @returns Promise<boolean> - True if the team has access to the feature
   */
  async checkIfTeamHasFeature(teamId: number, featureId: keyof AppFlags): Promise<boolean> {
    // Check team feature (includes hierarchy)
    const hasFeature = await this.featuresRepository.checkIfTeamHasFeature(teamId, featureId);
    if (hasFeature) return true;

    // Check auto opt-in for features in the OPT_IN_FEATURES allowlist
    if (isFeatureInOptInAllowlist(featureId)) {
      const hasAutoOptIn = await this.featureOptInRepository.getTeamAutoOptInPreference(teamId);
      if (hasAutoOptIn) return true;
    }

    return false;
  }

  /**
   * Get all features for a user with their tri-state status.
   * Returns userState, teamState, effectiveEnabled, and teamExplicitlyDisabled.
   * @param userId - The user ID
   * @param teamId - Optional team ID to check team-level settings
   */
  async listFeaturesForUser(userId: number, teamId?: number): Promise<FeatureWithStatus[]> {
    const userFeatures = await this.featureOptInRepository.getUserFeatures(userId);
    const allFeatures = await this.featuresRepository.getAllFeatures();

    // Get team features if teamId is provided
    const teamFeatures = teamId ? await this.featureOptInRepository.getTeamFeaturesWithDetails(teamId) : [];

    return allFeatures.map((feature) => {
      const userFeature = userFeatures.find((uf) => uf.feature.slug === feature.slug);
      const teamFeature = teamFeatures.find((tf) => tf.feature.slug === feature.slug);

      const userState = this.getFeatureState(userFeature);
      const teamState = this.getFeatureState(teamFeature);
      const teamExplicitlyDisabled = teamFeature ? teamFeature.enabled === false : false;

      return {
        slug: feature.slug,
        globallyEnabled: feature.enabled,
        userState,
        teamState,
        effectiveEnabled: this.computeEffectiveEnabled(
          feature.enabled,
          teamState,
          userState,
          teamExplicitlyDisabled
        ),
        teamExplicitlyDisabled,
        description: feature.description,
        type: feature.type,
      };
    });
  }

  /**
   * Get all features for a team with their tri-state status.
   * For teams, userState is always "inherit" since we're looking at team-level settings.
   */
  async listFeaturesForTeam(teamId: number): Promise<FeatureWithStatus[]> {
    const teamFeatures = await this.featureOptInRepository.getTeamFeaturesWithDetails(teamId);
    const allFeatures = await this.featuresRepository.getAllFeatures();

    return allFeatures.map((feature) => {
      const teamFeature = teamFeatures.find((tf) => tf.feature.slug === feature.slug);
      const teamState = this.getFeatureState(teamFeature);
      const teamExplicitlyDisabled = teamFeature ? teamFeature.enabled === false : false;

      return {
        slug: feature.slug,
        globallyEnabled: feature.enabled,
        userState: "inherit" as FeatureState, // Not applicable at team level
        teamState,
        effectiveEnabled: feature.enabled && teamState !== "disabled",
        teamExplicitlyDisabled,
        description: feature.description,
        type: feature.type,
      };
    });
  }

  /**
   * Get all features for an organization with their enabled status.
   * Organizations are teams with isOrganization = true, so we use the same logic.
   */
  async listFeaturesForOrganization(organizationId: number): Promise<FeatureWithStatus[]> {
    return this.listFeaturesForTeam(organizationId);
  }

  /**
   * Set the state of a feature for a user.
   * @param state - "enabled", "disabled", or "inherit"
   */
  async setUserFeatureEnabled(
    userId: number,
    featureSlug: string,
    state: FeatureState,
    assignedBy: string
  ): Promise<void> {
    await this.featureOptInRepository.setUserFeatureEnabled(userId, featureSlug, state, assignedBy);
  }

  /**
   * Set the state of a feature for a team.
   * @param state - "enabled", "disabled" (blocks for users), or "inherit"
   */
  async setTeamFeatureEnabled(
    teamId: number,
    featureSlug: string,
    state: FeatureState,
    assignedBy: string
  ): Promise<void> {
    await this.featureOptInRepository.setTeamFeatureEnabled(teamId, featureSlug, state, assignedBy);
  }

  /**
   * Set the state of a feature for an organization.
   * Organizations are teams, so we use the same method.
   * @param state - "enabled", "disabled" (blocks for teams/users), or "inherit"
   */
  async setOrganizationFeatureEnabled(
    organizationId: number,
    featureSlug: string,
    state: FeatureState,
    assignedBy: string
  ): Promise<void> {
    await this.featureOptInRepository.setTeamFeatureEnabled(organizationId, featureSlug, state, assignedBy);
  }

  /**
   * Get features that are eligible for opt-in via the banner system.
   * A feature is eligible if:
   * 1. It's in the opt-in allowlist
   * 2. The user hasn't already opted in (no UserFeatures row exists)
   * 3. The feature is globally enabled
   */
  async getEligibleOptInFeatures(userId: number): Promise<EligibleOptInFeature[]> {
    const eligibleFeatures: EligibleOptInFeature[] = [];
    const optInSlugs = getOptInFeatureSlugs();

    for (const slug of optInSlugs) {
      const config = getOptInFeatureConfig(slug);
      if (!config) continue;

      const userFeature = await this.featureOptInRepository.getUserFeature(userId, slug);

      // Row exists = user has already opted in
      if (userFeature) {
        continue;
      }

      const isGloballyEnabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally(
        slug as keyof AppFlags
      );
      if (!isGloballyEnabled) continue;

      eligibleFeatures.push({
        slug: config.slug,
        titleI18nKey: config.titleI18nKey,
        descriptionI18nKey: config.descriptionI18nKey,
        learnMoreUrl: config.learnMoreUrl,
      });
    }

    return eligibleFeatures;
  }

  /**
   * Check if a feature is in the opt-in allowlist.
   */
  isFeatureInOptInAllowlist(slug: string): boolean {
    return isFeatureInOptInAllowlist(slug);
  }

  /**
   * Get the opt-in configuration for a specific feature.
   */
  getOptInFeatureConfig(slug: string) {
    return getOptInFeatureConfig(slug);
  }

  /**
   * Check if a user has opted into a specific feature.
   * Uses row-existence semantics: if a UserFeatures row exists, the user has opted in.
   */
  async hasUserOptedIn(userId: number, featureSlug: string): Promise<boolean> {
    const userFeature = await this.featureOptInRepository.getUserFeature(userId, featureSlug);
    return !!userFeature; // Row exists = opted in
  }
}
