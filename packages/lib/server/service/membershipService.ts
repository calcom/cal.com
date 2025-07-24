import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";

export type MembershipCheckResult = {
  isMember: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  role?: MembershipRole;
};

export class MembershipService {
  constructor(private readonly membershipRepository: MembershipRepository = new MembershipRepository()) {}

  /**
   * Check if a user is a member of a team
   */
  async checkMembership(teamId: number, userId: number): Promise<MembershipCheckResult> {
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId });

    if (!membership || !membership.accepted) {
      return {
        isMember: false,
        isAdmin: false,
        isOwner: false,
      };
    }

    return {
      isMember: true,
      isAdmin: membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER,
      isOwner: membership.role === MembershipRole.OWNER,
      role: membership.role,
    };
  }
}
