import type { FeatureState } from "../types";

/**
 * Interface for the FeatureOptInRepository.
 * This interface defines methods for managing feature opt-in data access,
 * including UserFeatures, TeamFeatures records, and auto opt-in preferences.
 */
export interface IFeatureOptInRepository {
  // User feature methods
  getUserFeature(userId: number, featureId: string): Promise<{ enabled: boolean } | null>;
  setUserFeatureEnabled(
    userId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: string
  ): Promise<void>;
  getUserFeatures(userId: number): Promise<unknown[]>;

  // Team feature methods
  getTeamFeature(teamId: number, featureId: string): Promise<{ enabled: boolean } | null>;
  setTeamFeatureEnabled(
    teamId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: string
  ): Promise<void>;
  getTeamFeaturesWithDetails(teamId: number): Promise<unknown[]>;
  checkIfTeamHasExplicitlyDisabledFeature(teamId: number, featureId: string): Promise<boolean>;

  // Auto opt-in preference methods
  getUserAutoOptInPreference(userId: number): Promise<boolean>;
  setUserAutoOptInPreference(userId: number, autoOptIn: boolean): Promise<void>;
  getTeamAutoOptInPreference(teamId: number): Promise<boolean>;
  setTeamAutoOptInPreference(teamId: number, autoOptIn: boolean): Promise<void>;
  checkIfUserOrTeamHasAutoOptIn(userId: number): Promise<boolean>;
}
