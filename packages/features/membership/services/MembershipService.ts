import type { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";

export type MembershipCheckResult = {
  isMember: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  role?: MembershipRole;
};

export type TeamMember = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  defaultScheduleId: number | null;
  role: MembershipRole;
};

export type AllTeamMembersResponse = {
  members: TeamMember[];
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

  async getAllTeamMembers({ teamId }: { teamId: number }): Promise<AllTeamMembersResponse> {
    const memberships = await this.membershipRepository.findAllAcceptedMembers({ teamId });

    const members: TeamMember[] = memberships.map((membership) => ({
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      avatarUrl: membership.user.avatarUrl,
      username: membership.user.username,
      defaultScheduleId: membership.user.defaultScheduleId,
      role: membership.role,
    }));

    return { members };
  }
}
