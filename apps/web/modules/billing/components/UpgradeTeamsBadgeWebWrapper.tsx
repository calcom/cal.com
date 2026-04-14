"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useHasPaidPlan, useHasActiveTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";
import { UpgradePlanDialog } from "@calcom/web/modules/billing/components/UpgradePlanDialog";
import posthog from "posthog-js";
import { useState } from "react";

export function UpgradeTeamsBadgeWebWrapper({
  checkForActiveStatus,
  tracking,
}: {
  checkForActiveStatus?: boolean;
  tracking: string;
}) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();
  const { hasActiveTeamPlan, isTrial } = useHasActiveTeamPlan();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (hasPaidPlan) {
    if (!checkForActiveStatus || hasActiveTeamPlan) return null;

    const badgeString = isTrial ? t("trial_mode") : t("inactive_team_plan");
    const tooltipString = isTrial ? t("limited_access_trial_mode") : t("inactive_team_plan_description");

    return (
      <Tooltip content={tooltipString}>
        <Badge variant="gray">{badgeString}</Badge>
      </Tooltip>
    );
  }

  return (
    <>
      <Tooltip content={t("upgrade_to_enable_feature")}>
        <button
          className="cursor-pointer"
          onClick={() => {
            posthog.capture("upgrade_badge_clicked", { source: tracking, target: "team" });
            setDialogOpen(true);
          }}>
          <Badge variant="gray">{t("upgrade")}</Badge>
        </button>
      </Tooltip>
      <UpgradePlanDialog
        tracking={tracking}
        target="team"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
