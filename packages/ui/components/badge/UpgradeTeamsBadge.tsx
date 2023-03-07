import Link from "next/link";

import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeTeamsBadge = function UpgradeTeamsBadge() {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();

  if (hasPaidPlan) return null;

  return (
    <Tooltip content={t("upgrade_to_enable_feature")}>
      <Link href="/teams">
        <Badge variant="gray">{t("upgrade")}</Badge>
      </Link>
    </Tooltip>
  );
};
