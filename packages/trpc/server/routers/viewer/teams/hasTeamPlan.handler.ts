import { BillingPlanService } from "@calcom/features/ee/billing/domain/billing-plans";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { prisma } from "@calcom/prisma";

type HasTeamPlanOptions = {
  ctx: {
    user: { id: number };
  };
};

export const hasTeamPlanHandler = async ({ ctx }: HasTeamPlanOptions) => {
  const userId = ctx.user.id;

  const membershipRepository = new MembershipRepository(prisma);
  const memberships = await membershipRepository.findAllMembershipsByUserIdForBilling({ userId });
  const hasTeamPlan = memberships.some(
    (membership) => membership.accepted === true && membership.team.slug !== null
  );
  const billingPlanService = new BillingPlanService();
  const plan = await billingPlanService.getUserPlanByMemberships(memberships);

  return { hasTeamPlan: !!hasTeamPlan, plan };
};

export default hasTeamPlanHandler;
