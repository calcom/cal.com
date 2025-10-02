import {
  BillingPlan,
  ENTERPRISE_SLUGS,
  PLATFORM_ENTERPRISE_SLUGS,
  PLATFORM_PLANS_MAP,
} from "@calcom/features/ee/billing/constants";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import type { JsonValue } from "@calcom/types/Json";

export class BillingPlanService {
  // This private static member is necessary to prevent webpack from tree-shaking the BillingPlan enum.
  // With "sideEffects": false in package.json, webpack's static analysis fails to track enum usage
  // through class methods across package boundaries. This creates a strong reference that webpack
  // can see, preventing the enum initialization code from being incorrectly removed from the bundle.
  // See: https://calendso.slack.com/archives/C08LT9BLEET/p1759420015428149
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
    if (memberships.length === 0) return BillingPlan.INDIVIDUALS;

    for (const { team, user } of memberships) {
      if (team.isPlatform || user.isPlatformManaged) {
        if (PLATFORM_ENTERPRISE_SLUGS.includes(team.slug ?? "")) return BillingPlan.PLATFORM_ENTERPRISE;
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
            ? BillingPlan.ENTERPRISE
            : BillingPlan.ORGANIZATIONS;
        }

        if (!teamMetadata?.subscriptionId) continue;
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
