/**
 * It assumes that a user can only impersonate the members of the organization he is logged in to.
 * Note: Ensuring that one organization's member can't impersonate other organization's member isn't the job of this function
 */
export declare function ensureOrganizationIsReviewed(loggedInUserOrgId: number | undefined): Promise<void>;
//# sourceMappingURL=ensureOrganizationIsReviewed.d.ts.map