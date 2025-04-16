import Link from "next/link";

import { useHasPaidPlan, useHasActiveTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeTeamsBadge = function UpgradeTeamsBadge({
  checkForActiveStatus,
  translations = {},
}: {
  checkForActiveStatus?: boolean;
  translations?: Record<string, string>;
}) {
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasActiveTeamPlan, isTrial } = useHasActiveTeamPlan();

  if (hasPaidPlan) {
    if (!checkForActiveStatus || hasActiveTeamPlan) return null;
  }

  const badgeString = isTrial
    ? translations["trial_mode"]
    : hasPaidPlan
    ? translations["inactive_team_plan"]
    : translations["upgrade"];

  const tooltipString = isTrial
    ? translations["limited_access_trial_mode"]
    : hasPaidPlan
    ? translations["inactive_team_plan_description"]
    : translations["upgrade_to_enable_feature"];

  return (
    <Tooltip content={tooltipString}>
      <Link href={!hasPaidPlan ? "/teams" : ""}>
        <Badge variant="gray">{badgeString}</Badge>
      </Link>
    </Tooltip>
  );
};
