import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { BillingRepositoryFactory } from "@calcom/ee/billing/repository/billing/billingRepositoryFactory";
import { TeamBillingDataRepositoryFactory } from "@calcom/ee/billing/repository/teamBillingData/teamBillingDataRepositoryFactory";
import { TeamBillingServiceFactory } from "@calcom/ee/billing/service/teams/teamBillingServiceFactory";
import { BillingProviderServiceFactory } from "@calcom/features/ee/billing/service/billingProvider/billingProviderServiceFactory";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_SELF_HOSTED, IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
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
  if (IS_SELF_HOSTED) return { isActive: true, isTrial: false };

  const whereClause: Prisma.MembershipWhereInput = { userId: ctx.user.id, accepted: true };

  if (input?.ownerOnly) {
    whereClause.role = "OWNER";
  }

  const teams = await MembershipRepository.findAllAcceptedTeamMemberships(ctx.user.id, whereClause);

  if (!teams.length) return { isActive: false, isTrial: false };

  let isTrial = false;
  // check if user has at least on membership with an active plan
  for (const team of teams) {
    if (team.isPlatform && team.isOrganization) {
      const platformBilling = await prisma.platformBilling.findUnique({ where: { id: team.id } });
      if (platformBilling && platformBilling.plan !== "none" && platformBilling.plan !== "FREE") {
        return { isActive: true, isTrial: false };
      }
    }

    const billingProviderService = BillingProviderServiceFactory.getService();
    const teamBillingDataRepository = TeamBillingDataRepositoryFactory.getRepository(IS_TEAM_BILLING_ENABLED);
    const billingRepository = BillingRepositoryFactory.getRepository(
      team.isOrganization,
      IS_TEAM_BILLING_ENABLED
    );

    const teamBillingServiceFactory = new TeamBillingServiceFactory({
      billingProviderService,
      teamBillingDataRepository,
      billingRepository,
      isTeamBillingEnabled: IS_TEAM_BILLING_ENABLED,
    });

    const teamBillingService = teamBillingServiceFactory.init(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    if (
      subscriptionStatus === SubscriptionStatus.ACTIVE ||
      subscriptionStatus === SubscriptionStatus.PAST_DUE
    ) {
      return { isActive: true, isTrial: false };
    }
    if (subscriptionStatus === SubscriptionStatus.TRIALING) {
      isTrial = true;
    }
  }

  return { isActive: false, isTrial };
};

export default hasActiveTeamPlanHandler;
