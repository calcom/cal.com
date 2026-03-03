import { getTeamBillingServiceFactory } from "@calcom/features/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/features/ee/billing/repository/billing/IBillingRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export type ActivePaidTeamPlanResult = {
  isActive: boolean;
  isTrial: boolean;
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
  if (IS_SELF_HOSTED) {
    return { isActive: true, isTrial: false };
  }

  const whereClause: Prisma.MembershipWhereInput = { userId, accepted: true };

  if (options.ownerOnly) {
    whereClause.role = "OWNER";
  }

  const teams = await MembershipRepository.findAllAcceptedTeamMemberships(userId, whereClause);

  if (!teams.length) {
    return { isActive: false, isTrial: false };
  }

  let isTrial = false;

  for (const team of teams) {
    // Check platform billing for platform organizations
    if (team.isPlatform && team.isOrganization) {
      const platformBilling = await prisma.platformBilling.findUnique({ where: { id: team.id } });
      if (platformBilling && platformBilling.plan !== "none" && platformBilling.plan !== "FREE") {
        return { isActive: true, isTrial: false };
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
      return { isActive: true, isTrial: false };
    }

    if (subscriptionStatus === SubscriptionStatus.TRIALING) {
      isTrial = true;
    }
  }

  return { isActive: false, isTrial };
}
