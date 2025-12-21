import Link from "next/link";

import { useHasPaidPlan, useHasActiveTeamPlan } from "@calcom/features/billing/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeTeamsBadge = function UpgradeTeamsBadge({
  checkForActiveStatus,
}: {
  checkForActiveStatus?: boolean;
}) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasActiveTeamPlan, isTrial } = useHasActiveTeamPlan();

  if (hasPaidPlan) {
    if (!checkForActiveStatus || hasActiveTeamPlan) return null;
  }

  const badgeString = isTrial ? t("trial_mode") : hasPaidPlan ? t("inactive_team_plan") : t("upgrade");

  const tooltipString = isTrial
    ? t("limited_access_trial_mode")
    : hasPaidPlan
    ? t("inactive_team_plan_description")
    : t("upgrade_to_enable_feature");

  return (
    <Tooltip content={tooltipString}>
      <Link href={!hasPaidPlan ? "/teams" : ""}>
        <Badge variant="gray">{badgeString}</Badge>
      </Link>
    </Tooltip>
  );
};
