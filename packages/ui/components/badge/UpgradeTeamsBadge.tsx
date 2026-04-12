import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export type UpgradeTeamsBadgeProps = {
  checkForActiveStatus?: boolean;
  hasPaidPlan?: boolean;
  hasActiveTeamPlan?: boolean;
  isTrial?: boolean;
};

export const UpgradeTeamsBadge = function UpgradeTeamsBadge({
  checkForActiveStatus,
  hasPaidPlan = false,
  hasActiveTeamPlan = false,
  isTrial = false,
}: UpgradeTeamsBadgeProps) {
  const { t } = useLocale();

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
