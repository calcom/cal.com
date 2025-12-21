"use client";

import { useHasPaidPlan, useHasActiveTeamPlan } from "~/billing/hooks/useHasPaidPlan";

import { UpgradeTeamsBadge as UpgradeTeamsBadgeBase } from "@calcom/ui/components/badge";

export const UpgradeTeamsBadge = function UpgradeTeamsBadge({
  checkForActiveStatus,
}: {
  checkForActiveStatus?: boolean;
}) {
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
};
