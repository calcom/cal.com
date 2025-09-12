import { BillingPlans, ENTERPRISE_SLUGS, PLATFORM_ENTERPRISE_SLUGS } from "@calcom/ee/billing/constants";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

export class BillingPlanService {
  static async getUserPlanByUserId(userId: number) {
    const memberships = await MembershipRepository.findAllMembershipsByUserIdForBilling({ userId });

    if (memberships.length === 0) return BillingPlans.INDIVIDUALS;

    for (const { team, user } of memberships) {
      if (team.isPlatform || user.isPlatformManaged) {
        if (PLATFORM_ENTERPRISE_SLUGS.includes(team.slug ?? "")) return BillingPlans.PLATFORM_ENTERPRISE;
        if (!team.platformBilling) continue;

        switch (team.platformBilling.plan) {
          case "FREE":
          case "STARTER":
            return BillingPlans.PLATFORM_STARTER;
          case "ESSENTIALS":
            return BillingPlans.PLATFORM_ESSENTIALS;
          case "SCALE":
            return BillingPlans.PLATFORM_SCALE;
          case "ENTERPRISE":
            return BillingPlans.PLATFORM_ENTERPRISE;
          default:
            return team.platformBilling.plan;
        }
      } else {
        if (team.parent && team.parent.isOrganization && team.parentId && !team.parent.isPlatform) {
          return ENTERPRISE_SLUGS.includes(team.parent.slug ?? "")
            ? BillingPlans.ENTERPRISE
            : BillingPlans.ORGANIZATIONS;
        }

        if (team.isOrganization) {
          return ENTERPRISE_SLUGS.includes(team.slug ?? "")
            ? BillingPlans.ENTERPRISE
            : BillingPlans.ORGANIZATIONS;
        } else {
          return BillingPlans.TEAMS;
        }
      }
    }
    return BillingPlans.UNKNOWN;
  }
}
