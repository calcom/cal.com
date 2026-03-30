import { BillingPlanService } from "@calcom/features/ee/billing/domain/billing-plans";
import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import type { ExperimentConfigDto } from "@calcom/lib/dto/ExperimentConfigDto";
import { getExperimentService } from "@calcom/features/experiments/di/ExperimentService.container";
import { unstable_cache } from "next/cache";

export interface ExperimentData {
  configs: ExperimentConfigDto[];
  precomputedVariants: Record<string, string | null> | null;
}

// Caches only the user plan lookup (membership + billing). Not invalidated on experiment
// changes because plan data is independent of experiments. Plan changes (upgrade/downgrade)
// naturally trigger page refreshes, so a 1h stale window is acceptable for bucketing purposes.
function getCachedUserPlan(userId: number): Promise<string> {
  return unstable_cache(
    async () => {
      const membershipRepository = getMembershipRepository();
      const memberships = await membershipRepository.findAllMembershipsByUserIdForBilling({ userId });
      const billingPlanService = new BillingPlanService();
      return billingPlanService.getUserPlanByMemberships(memberships);
    },
    [`experiment-user-plan-${userId}`],
    { revalidate: 3600 }
  )();
}

export async function getCachedExperimentData(userId: number | undefined): Promise<ExperimentData> {
  const service = getExperimentService();
  const configs = await service.getAllRunningConfigs(); // cached via Redis in CachedExperimentRepository

  if (!userId) {
    return { configs, precomputedVariants: null };
  }

  const userPlan = await getCachedUserPlan(userId);
  const precomputedVariants = await service.getVariantsForUser({ userId, userPlan, configs }); // pure computation (hash-based)
  return { configs, precomputedVariants };
}
