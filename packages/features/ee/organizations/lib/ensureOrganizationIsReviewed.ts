import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";

/**
 * It assumes that a user can only impersonate the members of the organization he is logged in to.
 * Note: Ensuring that one organization's member can't impersonate other organization's member isn't the job of this function
 */
export async function ensureOrganizationIsReviewed(loggedInUserOrgId: number | undefined) {
  const organizationRepository = getOrganizationRepository();
  if (loggedInUserOrgId) {
    const org = await organizationRepository.findByIdIncludeOrganizationSettings({
      id: loggedInUserOrgId,
    });

    if (!org) {
      throw new Error("Error-OrgNotFound: You do not have permission to do this.");
    }

    if (!org.organizationSettings?.isAdminReviewed) {
      // If the org is not reviewed, we can't allow impersonation
      throw new Error("Error-OrgNotReviewed: You do not have permission to do this.");
    }
  }
}
