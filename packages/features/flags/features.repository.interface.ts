import type { AppFlags, FeatureState } from "./config";

/**
 * Interface for the core FeaturesRepository.
 * This interface defines methods for checking feature flags and team feature access.
 */
export interface IFeaturesRepository {
  checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean>;
  checkIfUserHasFeature(userId: number, slug: string): Promise<boolean>;
  checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean>;
  checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags): Promise<boolean>;
  getTeamsWithFeatureEnabled(slug: keyof AppFlags): Promise<number[]>;
  setUserFeatureState(
    userId: number,
    featureId: keyof AppFlags,
    state: FeatureState,
    assignedBy: string
  ): Promise<void>;
  setTeamFeatureState(
    teamId: number,
    featureId: keyof AppFlags,
    state: FeatureState,
    assignedBy: string
  ): Promise<void>;
  /**
   * Get user's feature states for multiple features.
   * @returns Record<featureId, 'enabled' | 'disabled' | 'inherit'>
   */
  getUserFeatureStates(input: { userId: number; featureIds: string[] }): Promise<Record<string, FeatureState>>;
  /**
   * Get team's feature states for multiple features.
   * @returns Record<featureId, 'enabled' | 'disabled' | 'inherit'>
   */
  getTeamFeatureStates(input: { teamId: number; featureIds: string[] }): Promise<Record<string, FeatureState>>;
  /**
   * Get a single feature's state across multiple teams.
   * Optimized for querying many teams for one feature.
   * @returns Record<teamId, 'enabled' | 'disabled' | 'inherit'>
   */
  getFeatureStateForTeams(input: { teamIds: number[]; featureId: string }): Promise<Record<number, FeatureState>>;
}
