import type { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";

export type MembershipCheckResult = {
  isMember: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  role?: MembershipRole;
};

export class MembershipService {
  constructor(private readonly membershipRepository: PrismaMembershipRepository) {}

  /**
   * Checks the membership status of a user within a specific team.
   */
  async checkMembership(teamId: number, userId: number): Promise<MembershipCheckResult> {
    const membership = await this.membershipRepository.findUniqueByUserIdAndTeamId({ teamId, userId });

    if (!membership || !membership.accepted) {
      return {
        isMember: false,
        isAdmin: false,
        isOwner: false,
        role: undefined,
      };
    }

    const { role } = membership;
    const isOwner = role === MembershipRole.OWNER;
    const isAdmin = isOwner || role === MembershipRole.ADMIN;

    return {
      isMember: true,
      isAdmin,
      isOwner,
      role,
    };
  }
}
