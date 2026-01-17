"use client";

import { UpgradeTeamsBadge as UpgradeTeamsBadgeBase } from "@calcom/ui/components/badge";
import { useHasPaidPlan, useHasActiveTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";

export function UpgradeTeamsBadgeWebWrapper({ checkForActiveStatus }: { checkForActiveStatus?: boolean }) {
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasActiveTeamPlan, isTrial } = useHasActiveTeamPlan();

  return (
    <UpgradeTeamsBadgeBase
      checkForActiveStatus={checkForActiveStatus}
      hasPaidPlan={hasPaidPlan}
      hasActiveTeamPlan={hasActiveTeamPlan}
      isTrial={isTrial}
    />
  );
}
