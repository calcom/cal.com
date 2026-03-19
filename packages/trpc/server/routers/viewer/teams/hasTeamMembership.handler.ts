import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";

type HasTeamMembershipOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamMembershipHandler = async ({ ctx }: HasTeamMembershipOptions) => {
  const userId = ctx.user.id;
  const membershipRepository = getMembershipRepository();
  const hasTeamMembership = await membershipRepository.hasAnyTeamMembershipByUserId({ userId });
  return { hasTeamMembership };
};

export default hasTeamMembershipHandler;
