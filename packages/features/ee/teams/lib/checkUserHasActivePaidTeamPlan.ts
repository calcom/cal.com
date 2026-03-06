import { getTeamBillingServiceFactory } from "@calcom/features/ee/billing/di/containers/Billing";
import { getBillingPeriodRepository } from "@calcom/features/ee/billing/di/containers/BillingPeriodRepository";
import { SubscriptionStatus } from "@calcom/features/ee/billing/repository/billing/IBillingRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { BillingPeriod } from "@calcom/prisma/enums";

export type ActivePaidTeamPlanResult = {
  isActive: boolean;
  isTrial: boolean;
  billingPeriod: BillingPeriod | null;
};

export type CheckUserHasActivePaidTeamPlanOptions = {
  ownerOnly?: boolean;
};

/**
 * Checks if a user has at least one team membership with an active paid subscription.
 *
 * @param userId - The ID of the user to check
 * @param options - Optional settings like ownerOnly to filter by ownership role
 * @returns Object with isActive (true if user has paid plan) and isTrial (true if user is on trial)
 */
export async function checkUserHasActivePaidTeamPlan(
  userId: number,
  options: CheckUserHasActivePaidTeamPlanOptions = {}
): Promise<ActivePaidTeamPlanResult> {
  const billingPeriodRepository = getBillingPeriodRepository();
  if (IS_SELF_HOSTED) {
    return { isActive: true, isTrial: false, billingPeriod: null };
  }

  const whereClause: Prisma.MembershipWhereInput = { userId, accepted: true };

  if (options.ownerOnly) {
    whereClause.role = "OWNER";
  }

  const teams = await MembershipRepository.findAllAcceptedTeamMemberships(userId, whereClause);

  if (!teams.length) {
    return { isActive: false, isTrial: false, billingPeriod: null };
  }

  let isTrial = false;
  let relevantTeamId: number | null = null;

  for (const team of teams) {
    // Check platform billing for platform organizations
    if (team.isPlatform && team.isOrganization) {
      const platformBilling = await prisma.platformBilling.findUnique({ where: { id: team.id } });
      if (platformBilling && platformBilling.plan !== "none" && platformBilling.plan !== "FREE") {
        return {
          isActive: true,
          isTrial: false,
          billingPeriod: await billingPeriodRepository.findBillingPeriodByTeamId(team.id),
        };
      }
    }

    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = teamBillingServiceFactory.init(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    // Only ACTIVE and PAST_DUE count as paid plans
    if (
      subscriptionStatus === SubscriptionStatus.ACTIVE ||
      subscriptionStatus === SubscriptionStatus.PAST_DUE
    ) {
      return {
        isActive: true,
        isTrial: false,
        billingPeriod: await billingPeriodRepository.findBillingPeriodByTeamId(team.id),
      };
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
}
