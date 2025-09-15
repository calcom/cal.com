import { BillingPlanService } from "@calcom/features/ee/billing/domain/billing-plans";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

type HasTeamPlanOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamPlanHandler = async ({ ctx }: HasTeamPlanOptions) => {
  const userId = ctx.user.id;

  const memberships = await MembershipRepository.findAllMembershipsByUserIdForBilling({ userId });
  const hasTeamPlan = memberships.some(
    (membership) => membership.accepted === true && membership.team.slug !== null
  );
  const plan = await BillingPlanService.getUserPlanByMemberships(memberships);

  return { hasTeamPlan: !!hasTeamPlan, plan };
};

export default hasTeamPlanHandler;
