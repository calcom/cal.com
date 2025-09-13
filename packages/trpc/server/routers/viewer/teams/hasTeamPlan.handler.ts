import { BillingPlanService } from "@calcom/features/ee/billing/billing-plan-service";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

type HasTeamPlanOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamPlanHandler = async ({ ctx }: HasTeamPlanOptions) => {
  const userId = ctx.user.id;

  const hasTeamPlan = await MembershipRepository.findFirstAcceptedMembershipByUserId(userId);
  const plan = await BillingPlanService.getUserPlanByUserId(userId);

  return { hasTeamPlan: !!hasTeamPlan, plan };
};

export default hasTeamPlanHandler;
