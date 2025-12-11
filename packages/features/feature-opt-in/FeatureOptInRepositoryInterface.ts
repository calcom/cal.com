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
}
