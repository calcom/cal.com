import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { BillingPlanService } from "@calcom/features/ee/billing/domain/billing-plans";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TBillingStatusInputSchema } from "./billingStatus.schema";

type BillingStatusOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TBillingStatusInputSchema;
};

export const billingStatusHandler = async ({ ctx, input }: BillingStatusOptions) => {
  if (IS_SELF_HOSTED) {
    return {
      hasTeamPlan: true,
      plan: "SELF_HOSTED",
      isActive: true,
      isTrial: false,
    };
  }

  const userId = ctx.user.id;

  // Get membership data for hasTeamPlan check
  const membershipRepository = new MembershipRepository(prisma);
  const memberships = await membershipRepository.findAllMembershipsByUserIdForBilling({ userId });

  const hasTeamPlan = memberships.some(
    (membership) => membership.accepted === true && membership.team.slug !== null
  );

  const billingPlanService = new BillingPlanService();
  const plan = await billingPlanService.getUserPlanByMemberships(memberships);

  // Get active team plan status
  const whereClause: Prisma.MembershipWhereInput = { userId, accepted: true };

  if (input?.ownerOnly) {
    whereClause.role = "OWNER";
  }

  const teams = await MembershipRepository.findAllAcceptedTeamMemberships(userId, whereClause);

  if (!teams.length) {
    return {
      hasTeamPlan: !!hasTeamPlan,
      plan,
      isActive: false,
      isTrial: false,
    };
  }

  let isTrial = false;

  // Check if user has at least one membership with an active plan
  for (const team of teams) {
    if (team.isPlatform && team.isOrganization) {
      const platformBilling = await prisma.platformBilling.findUnique({
        where: { id: team.id },
        select: { plan: true },
      });
      if (platformBilling && platformBilling.plan !== "none" && platformBilling.plan !== "FREE") {
        return {
          hasTeamPlan: !!hasTeamPlan,
          plan,
          isActive: true,
          isTrial: false,
        };
      }
    }

    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = teamBillingServiceFactory.init(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    if (
      subscriptionStatus === SubscriptionStatus.ACTIVE ||
      subscriptionStatus === SubscriptionStatus.PAST_DUE
    ) {
      return {
        hasTeamPlan: !!hasTeamPlan,
        plan,
        isActive: true,
        isTrial: false,
      };
    }
    if (subscriptionStatus === SubscriptionStatus.TRIALING) {
      isTrial = true;
    }
  }

  return {
    hasTeamPlan: !!hasTeamPlan,
    plan,
    isActive: false,
    isTrial,
  };
};

export default billingStatusHandler;
