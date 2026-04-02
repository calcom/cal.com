import { type OrgMembershipLookup, ProfileRepository } from "@calcom/platform-libraries";
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
