import { BillingPlan, ENTERPRISE_SLUGS, PLATFORM_ENTERPRISE_SLUGS } from "@calcom/ee/billing/constants";

export class BillingPlanService {
  async getUserPlanByMemberships(
    memberships: {
      team: {
        isOrganization: boolean;
        isPlatform: boolean;
        slug: string | null;
        parent: {
          isOrganization: boolean;
          slug: string | null;
          isPlatform: boolean;
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
    if (memberships.length === 0) return BillingPlan.INDIVIDUALS;

    for (const { team, user } of memberships) {
      if (team.isPlatform || user.isPlatformManaged) {
        if (PLATFORM_ENTERPRISE_SLUGS.includes(team.slug ?? "")) return BillingPlan.PLATFORM_ENTERPRISE;
        if (!team.platformBilling) continue;

        switch (team.platformBilling.plan) {
          case "FREE":
          case "STARTER":
            return BillingPlan.PLATFORM_STARTER;
          case "ESSENTIALS":
            return BillingPlan.PLATFORM_ESSENTIALS;
          case "SCALE":
            return BillingPlan.PLATFORM_SCALE;
          case "ENTERPRISE":
            return BillingPlan.PLATFORM_ENTERPRISE;
          default:
            return team.platformBilling.plan;
        }
      } else {
        if (team.parent && team.parent.isOrganization && !team.parent.isPlatform) {
          return ENTERPRISE_SLUGS.includes(team.parent.slug ?? "")
            ? BillingPlan.ENTERPRISE
            : BillingPlan.ORGANIZATIONS;
        }

        if (team.isOrganization) {
          return ENTERPRISE_SLUGS.includes(team.slug ?? "")
            ? BillingPlan.ENTERPRISE
            : BillingPlan.ORGANIZATIONS;
        } else {
          return BillingPlan.TEAMS;
        }
      }
    }
    return BillingPlan.UNKNOWN;
  }
}
