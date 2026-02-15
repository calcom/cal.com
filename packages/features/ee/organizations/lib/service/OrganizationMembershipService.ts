import type { IOrganizationRepository } from "../repository/IOrganizationRepository";
export interface IOrganizationMembershipServiceDependencies {
  organizationRepository: IOrganizationRepository;
}

export class OrganizationMembershipService {
  constructor(private readonly deps: IOrganizationMembershipServiceDependencies) {}

  /**
   * Determines if user should be auto-accepted to an organization or its sub-teams based on email domain
   */
  async shouldAutoAccept({
    organizationId,
    userEmail,
  }: {
    organizationId: number;
    userEmail: string;
  }): Promise<boolean> {
    const orgSettings =
      await this.deps.organizationRepository.getOrganizationAutoAcceptSettings(organizationId);

    if (!orgSettings) return false;

    const { orgAutoAcceptEmail, isOrganizationVerified } = orgSettings;

    if (!isOrganizationVerified || !orgAutoAcceptEmail) return false;

    // Case-insensitive comparison (email domains are case-insensitive per RFC)
    const emailDomain = userEmail.split("@")[1]?.trim().toLowerCase();
    const autoAcceptEmailDomain = orgAutoAcceptEmail.trim().toLowerCase();

    if (!emailDomain) return false;

    return emailDomain === autoAcceptEmailDomain;
  }
}
