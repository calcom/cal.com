import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";

type HasTeamMembershipOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamMembershipHandler = async ({ ctx }: HasTeamMembershipOptions) => {
  const userId = ctx.user.id;
  const hasTeamMembership = await MembershipRepository.hasAnyTeamMembershipByUserId({ userId });
  return { hasTeamMembership };
};

export default hasTeamMembershipHandler;
