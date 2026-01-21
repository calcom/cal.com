export interface IOrganizationRepository {
    getOrganizationAutoAcceptSettings(organizationId: number): Promise<{
        orgAutoAcceptEmail: string | null;
        isOrganizationVerified: boolean | null;
    } | null>;
}