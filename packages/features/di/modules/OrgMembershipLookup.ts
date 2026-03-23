import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";

import { createModule, type Module } from "../di";
import { DI_TOKENS } from "../tokens";

/**
 * Minimal capability interface for looking up a user's organization membership.
 * Used as a fallback when org context can't be determined from request or eventType.
 */
export interface OrgMembershipLookup {
  findFirstOrganizationIdForUser(args: { userId: number }): Promise<number | null>;
}

/**
 * Adapter that wraps ProfileRepository's static method to satisfy the OrgMembershipLookup interface.
 * This lives in the composition root where implementation details are wired together.
 */
const orgMembershipLookupAdapter: OrgMembershipLookup = {
  findFirstOrganizationIdForUser: ({ userId }: { userId: number }) =>
    ProfileRepository.findFirstOrganizationIdForUser({ userId }),
};

const orgMembershipLookupModule: Module = createModule();
orgMembershipLookupModule.bind(DI_TOKENS.ORG_MEMBERSHIP_LOOKUP).toValue(orgMembershipLookupAdapter);

export { orgMembershipLookupModule };
