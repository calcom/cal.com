import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";

type HasTeamMembershipOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamMembershipHandler = async ({ ctx }: HasTeamMembershipOptions) => {
  const userId = ctx.user.id;
  const hasTeamMembership = await PrismaMembershipRepository.hasAnyTeamMembershipByUserId({ userId });
  return { hasTeamMembership };
};

export default hasTeamMembershipHandler;
