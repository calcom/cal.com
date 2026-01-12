import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { OrgMembershipLookup } from "@calcom/trpc/server/routers/viewer/slots/util";
import { Injectable } from "@nestjs/common";

/**
 * NestJS service that implements OrgMembershipLookup interface.
 * Wraps ProfileRepository's static method for DI compatibility.
 */
@Injectable()
export class OrgMembershipLookupService implements OrgMembershipLookup {
  async findFirstOrganizationIdForUser({ userId }: { userId: number }): Promise<number | null> {
    return ProfileRepository.findFirstOrganizationIdForUser({ userId });
  }
}
