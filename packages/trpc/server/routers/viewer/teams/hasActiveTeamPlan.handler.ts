import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { getBillingPeriodRepository } from "@calcom/features/ee/billing/di/containers/BillingPeriodRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { THasActiveTeamPlanInputSchema } from "./hasActiveTeamPlan.schema";

type HasActiveTeamPlanOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: THasActiveTeamPlanInputSchema;
};

export const hasActiveTeamPlanHandler = async ({ ctx, input }: HasActiveTeamPlanOptions) => {
  const billingPeriodRepository = getBillingPeriodRepository();
  if (IS_SELF_HOSTED) return { isActive: true, isTrial: false, billingPeriod: null };

  const whereClause: Prisma.MembershipWhereInput = { userId: ctx.user.id, accepted: true };

  if (input?.ownerOnly) {
    whereClause.role = "OWNER";
  }

  const teams = await MembershipRepository.findAllAcceptedTeamMemberships(ctx.user.id, whereClause);

  if (!teams.length) return { isActive: false, isTrial: false, billingPeriod: null };

  let isTrial = false;
  let relevantTeamId: number | null = null;
  // check if user has at least one membership with an active plan
  for (const team of teams) {
    if (team.isPlatform && team.isOrganization) {
      const platformBilling = await prisma.platformBilling.findUnique({ where: { id: team.id } });
      if (platformBilling && platformBilling.plan !== "none" && platformBilling.plan !== "FREE") {
        return { isActive: true, isTrial: false, billingPeriod: await billingPeriodRepository.findBillingPeriodByTeamId(team.id) };
      }
    }

    const teamBillingServiceFactory = getTeamBillingServiceFactory();

    const teamBillingService = teamBillingServiceFactory.init(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    if (
      subscriptionStatus === SubscriptionStatus.ACTIVE ||
      subscriptionStatus === SubscriptionStatus.PAST_DUE
    ) {
      return { isActive: true, isTrial: false, billingPeriod: await billingPeriodRepository.findBillingPeriodByTeamId(team.id) };
    }
    if (subscriptionStatus === SubscriptionStatus.TRIALING) {
      isTrial = true;
      relevantTeamId = team.id;
    }
  }

  const billingPeriod = relevantTeamId
    ? await billingPeriodRepository.findBillingPeriodByTeamId(relevantTeamId)
    : null;

  return { isActive: false, isTrial, billingPeriod };
};

export default hasActiveTeamPlanHandler;
