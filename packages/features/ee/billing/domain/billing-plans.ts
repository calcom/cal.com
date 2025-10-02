import {
  BillingPlan,
  ENTERPRISE_SLUGS,
  PLATFORM_ENTERPRISE_SLUGS,
  PLATFORM_PLANS_MAP,
} from "@calcom/features/ee/billing/constants";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import type { JsonValue } from "@calcom/types/Json";

export { BillingPlan, ENTERPRISE_SLUGS, PLATFORM_ENTERPRISE_SLUGS, PLATFORM_PLANS_MAP };

export class BillingPlanService {
  private static BillingPlan = BillingPlan;

  async getUserPlanByMemberships(
    memberships: {
      team: {
        isOrganization: boolean;
        isPlatform: boolean;
        slug: string | null;
        metadata: JsonValue;
        parent: {
          isOrganization: boolean;
          slug: string | null;
          isPlatform: boolean;
          metadata: JsonValue;
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
    if (memberships.length === 0) return BillingPlanService.BillingPlan.INDIVIDUALS;

    for (const { team, user } of memberships) {
      if (team.isPlatform || user.isPlatformManaged) {
        if (PLATFORM_ENTERPRISE_SLUGS.includes(team.slug ?? ""))
          return BillingPlanService.BillingPlan.PLATFORM_ENTERPRISE;
        if (!team.platformBilling) continue;

        return PLATFORM_PLANS_MAP[team.platformBilling.plan] ?? team.platformBilling.plan;
      } else {
        let teamMetadata;
        try {
          teamMetadata = teamMetadataStrictSchema.parse(team.metadata ?? {});
        } catch {
          teamMetadata = null;
        }

        let parentTeamMetadata;
        try {
          parentTeamMetadata = teamMetadataStrictSchema.parse(team.parent?.metadata ?? {});
        } catch {
          parentTeamMetadata = null;
        }

        if (
          team.parent &&
          team.parent.isOrganization &&
          parentTeamMetadata?.subscriptionId &&
          !team.parent.isPlatform
        ) {
          return ENTERPRISE_SLUGS.includes(team.parent.slug ?? "")
            ? BillingPlanService.BillingPlan.ENTERPRISE
            : BillingPlanService.BillingPlan.ORGANIZATIONS;
        }

        if (!teamMetadata?.subscriptionId) continue;
        if (team.isOrganization) {
          return ENTERPRISE_SLUGS.includes(team.slug ?? "")
            ? BillingPlanService.BillingPlan.ENTERPRISE
            : BillingPlanService.BillingPlan.ORGANIZATIONS;
        } else {
          return BillingPlanService.BillingPlan.TEAMS;
        }
      }
    }
    return BillingPlanService.BillingPlan.UNKNOWN;
  }
}
