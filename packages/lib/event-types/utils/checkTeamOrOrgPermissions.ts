import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";

/**
 * Checks if a user is an owner/admin of an org/team
 * @param userId - The ID of the user to check permissions for
 * @param teamId - The ID of the team to check permissions for
 * @param teamParentId - Optional parent organization ID of the team
 * @returns Promise<boolean> - True if the user has admin permissions, false otherwise
 */
export async function checkTeamOrOrgPermissions(
  userId: number | null | undefined,
  teamId: number | null | undefined,
  teamParentId?: number | null
): Promise<boolean> {
  if (!userId || !teamId) return false;

  const isTeamAdminResult = await isTeamAdmin(userId, teamId);
  if (isTeamAdminResult) return true;

  if (teamParentId) {
    const isOrgAdminResult = await isOrganisationAdmin(userId, teamParentId);
    if (isOrgAdminResult) return true;
  }

  return false;
}
