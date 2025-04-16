import Link from "next/link";

import { useHasPaidPlan, useHasActiveTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeTeamsBadge = function UpgradeTeamsBadge({
  checkForActiveStatus,
  translations = {},
}: {
  checkForActiveStatus?: boolean;
  translations?: Record<string, string>;
}) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasActiveTeamPlan, isTrial } = useHasActiveTeamPlan();

  if (hasPaidPlan) {
    if (!checkForActiveStatus || hasActiveTeamPlan) return null;
  }

  const badgeString = isTrial
    ? translations["trial_mode"] || t("trial_mode")
    : hasPaidPlan
    ? translations["inactive_team_plan"] || t("inactive_team_plan")
    : translations["upgrade"] || t("upgrade");

  const tooltipString = isTrial
    ? translations["limited_access_trial_mode"] || t("limited_access_trial_mode")
    : hasPaidPlan
    ? translations["inactive_team_plan_description"] || t("inactive_team_plan_description")
    : translations["upgrade_to_enable_feature"] || t("upgrade_to_enable_feature");

  return (
    <Tooltip content={tooltipString}>
      <Link href={!hasPaidPlan ? "/teams" : ""}>
        <Badge variant="gray">{badgeString}</Badge>
      </Link>
    </Tooltip>
  );
};
