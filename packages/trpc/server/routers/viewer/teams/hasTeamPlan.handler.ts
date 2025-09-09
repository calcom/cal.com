import { MembershipRepository } from "@calcom/lib/server/repository/membership";

type HasTeamPlanOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamPlanHandler = async ({ ctx }: HasTeamPlanOptions) => {
  const userId = ctx.user.id;

  const hasTeamPlan = await MembershipRepository.findFirstAcceptedMembershipByUserId(userId);

  return { hasTeamPlan: !!hasTeamPlan };
};

export default hasTeamPlanHandler;
