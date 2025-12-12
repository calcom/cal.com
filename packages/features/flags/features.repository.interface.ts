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
   * Get user's feature state.
   * @returns 'enabled' | 'disabled' | 'inherit'
   */
  getUserFeatureState(input: { userId: number; featureId: string }): Promise<FeatureState>;
  /**
   * Get team's feature state.
   * @returns 'enabled' | 'disabled' | 'inherit'
   */
  getTeamFeatureState(input: { teamId: number; featureId: string }): Promise<FeatureState>;
}
