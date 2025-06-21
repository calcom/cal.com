import { FeaturesRepository } from "@calcom/features/flags/features.repository";

/**
 * Checks if the restriction schedule feature is enabled for a team
 * @param teamId - The team ID to check
 * @returns Promise<boolean> - True if the feature is enabled, false otherwise
 */
export async function isRestrictionScheduleEnabled(teamId?: number): Promise<boolean> {
  if (!teamId) {
    return false; // Personal events don't have restriction schedules
  }

  const featureRepo = new FeaturesRepository();
  return await featureRepo.checkIfTeamHasFeature(teamId, "restriction-schedule");
}
