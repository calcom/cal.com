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
   * Checks the membership status of a user within a specific team.
   */
  async checkMembership(teamId: number, userId: number): Promise<MembershipCheckResult> {
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ teamId, userId });

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
