import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { OrgMembershipLookup } from "@calcom/trpc/server/routers/viewer/slots/util";

import { createModule, type Module } from "../di";
import { DI_TOKENS } from "../tokens";

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
