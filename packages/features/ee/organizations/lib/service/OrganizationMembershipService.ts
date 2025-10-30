export interface IOrganizationRepository {
    getOrganizationAutoAcceptSettings(organizationId: number): Promise<{
        orgAutoAcceptEmail: string | null;
        isOrganizationVerified: boolean | null;
    } | null>;
}

export class OrganizationMembershipService {
    constructor(private readonly organizationRepository: IOrganizationRepository) { }

    /**
     * Determines if user should be auto-accepted based on email domain
     * Extracted from TRPC inviteMember/utils.ts getOrgConnectionInfo (lines 278-282)
     *
     * Uses case-insensitive comparison per RFC 5321 (email domains are case-insensitive)
     */
    async shouldAutoAccept({
        organizationId,
        userEmail,
    }: {
        organizationId: number;
        userEmail: string;
    }): Promise<boolean> {
        const orgSettings = await this.organizationRepository.getOrganizationAutoAcceptSettings(organizationId);

        if (!orgSettings) return false;

        const { orgAutoAcceptEmail, isOrganizationVerified } = orgSettings;

        if (!isOrganizationVerified || !orgAutoAcceptEmail) return false;

        // Case-insensitive comparison (email domains are case-insensitive per RFC)
        const emailDomain = userEmail.split("@")[1]?.toLowerCase();
        const orgDomain = orgAutoAcceptEmail.toLowerCase();

        if (!emailDomain) return false;

        return emailDomain === orgDomain;
    }
}
