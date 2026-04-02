import {
  BILLING_PLANS,
  type BillingPlan,
  ENTERPRISE_SLUGS,
  PLATFORM_ENTERPRISE_SLUGS,
  PLATFORM_PLANS_MAP,
} from "@calcom/features/ee/billing/constants";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import type { JsonValue } from "@calcom/types/Json";

export class BillingPlanService {
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
  ): Promise<BillingPlan> {
    if (memberships.length === 0) return BILLING_PLANS.INDIVIDUALS;

    for (const { team, user } of memberships) {
      if (team.isPlatform || user.isPlatformManaged) {
        if (PLATFORM_ENTERPRISE_SLUGS.includes(team.slug ?? "")) return BILLING_PLANS.PLATFORM_ENTERPRISE;
        if (!team.platformBilling) continue;

        return PLATFORM_PLANS_MAP[team.platformBilling.plan] ?? team.platformBilling.plan;
      }
      const parentTeamMetadataResult = teamMetadataStrictSchema.safeParse(team.parent?.metadata ?? {});
      const parentTeamMetadata = parentTeamMetadataResult.success ? parentTeamMetadataResult.data : null;
      if (
        team.parent &&
        team.parent.isOrganization &&
        parentTeamMetadata?.subscriptionId &&
        !team.parent.isPlatform
      ) {
        return ENTERPRISE_SLUGS.includes(team.parent.slug ?? "")
          ? BILLING_PLANS.ENTERPRISE
          : BILLING_PLANS.ORGANIZATIONS;
      }
      const teamMetadataResult = teamMetadataStrictSchema.safeParse(team.metadata ?? {});
      const teamMetadata = teamMetadataResult.success ? teamMetadataResult.data : null;
      // (emrysal) if we do an early return on !teamMetadata?.subscriptionId here, the bundler is not smart enough to infer
      // that it shouldn't clear out the BILLING_PLANS before the for() scope finishes.
      if (team.isOrganization && teamMetadata?.subscriptionId) {
        return ENTERPRISE_SLUGS.includes(team.slug ?? "")
          ? BILLING_PLANS.ENTERPRISE
          : BILLING_PLANS.ORGANIZATIONS;
      }
      if (teamMetadata?.subscriptionId) {
        return BILLING_PLANS.TEAMS;
      }
      // no subscriptionId or parent subscription id in this loop, so this membership hasn't got a plan.
      // continue;
    }
    return BILLING_PLANS.UNKNOWN;
  }
}
