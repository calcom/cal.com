import type { FeatureState } from "./types";

/**
 * Interface for the FeatureOptInRepository.
 * Handles opt-in state management for users and teams.
 */
export interface IFeatureOptInRepository {
  /**
   * Get user's feature state.
   * @returns Row with enabled value, or null if no row exists (inherit)
   */
  getUserFeatureState(input: { userId: number; featureId: string }): Promise<{ enabled: boolean } | null>;

  /**
   * Get team's feature state.
   * @returns Row with enabled value, or null if no row exists (inherit)
   */
  getTeamFeatureState(input: { teamId: number; featureId: string }): Promise<{ enabled: boolean } | null>;

  /**
   * Set user feature with tri-state logic.
   * - "enabled" → upsert row with enabled = true
   * - "disabled" → upsert row with enabled = false
   * - "inherit" → delete the row
   */
  setUserFeatureState(input: {
    userId: number;
    featureId: string;
    state: FeatureState;
    assignedBy: number;
  }): Promise<void>;

  /**
   * Set team feature with tri-state logic.
   * - "enabled" → upsert row with enabled = true
   * - "disabled" → upsert row with enabled = false
   * - "inherit" → delete the row
   */
  setTeamFeatureState(input: {
    teamId: number;
    featureId: string;
    state: FeatureState;
    assignedBy: number;
  }): Promise<void>;

  /**
   * Get all feature states for a user (for settings page).
   */
  getAllUserFeatureStates(input: { userId: number }): Promise<Array<{ featureId: string; enabled: boolean }>>;

  /**
   * Get all feature states for a team (for settings page).
   */
  getAllTeamFeatureStates(input: { teamId: number }): Promise<Array<{ featureId: string; enabled: boolean }>>;
}
