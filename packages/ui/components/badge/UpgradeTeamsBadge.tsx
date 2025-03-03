import Link from "next/link";

import { useHasActiveTeamPlan, useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeTeamsBadge = function UpgradeTeamsBadge({ checkForTrial }: { checkForTrial?: boolean }) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const { isTrial } = useHasActiveTeamPlan();

  if (hasPaidPlan) {
    if (!checkForTrial && !isTrial) return null;
  }

  return (
    <Tooltip content={isTrial ? t("limited_access_trial_mode") : t("upgrade_to_enable_feature")}>
      {isTrial ? (
        <Badge variant="gray">{t("trial_mode")}</Badge>
      ) : (
        <Link href="/teams">
          <Badge variant="gray">{t("upgrade")}</Badge>
        </Link>
      )}
    </Tooltip>
  );
};
