import { BillingPlans } from "@calcom/ee/billing/constants";
import type { Plans } from "@calcom/prisma/enums";

export class BillingPlanService {
  async getUserPlanByMemberships(
    memberships: {
      team: {
        plan: Plans | null;
        isOrganization: boolean;
        isPlatform: boolean;
        parent: {
          isOrganization: boolean;
          isPlatform: boolean;
          plan: Plans | null;
        } | null;
        platformBilling: {
          plan: string;
        } | null;
      };
      user: {
        isPlatformManaged: boolean;
      };
    }[]
  ) {
    if (memberships.length === 0) return BillingPlans.INDIVIDUALS;

    for (const { team, user } of memberships) {
      if (team.isPlatform || user.isPlatformManaged) {
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
        if (team.parent?.plan) return team.parent.plan;
        if (team.plan) return team.plan;
      }
    }
    return BillingPlans.UNKNOWN;
  }
}
