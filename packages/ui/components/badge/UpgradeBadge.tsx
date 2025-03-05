import Link from "next/link";

import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

// TODO: make "teams" | "organizations" | "enterprise" a "Plan" type
export const UpgradeBadge = function UpgradeBadge({ to }: { to?: "teams" | "organizations" | "enterprise" }) {
  const { t } = useLocale();
  const { hasPaidPlan } = useHasPaidPlan();

  // TODO: check for what plan, i.e. hasTeamsPlan or hasEnterprisePlan
  if (hasPaidPlan) return null;

  if (to === "teams") {
    return (
      <Tooltip content={t("upgrade_to_team")}>
        <Link href="/teams">
          <Badge variant="gray">{t("upgrade")}</Badge>
        </Link>
      </Tooltip>
    );
  }

  // TODO: ship /organizations page
  if (to === "organizations") {
    return (
      <Tooltip content={t("upgrade_to_organizations")}>
        <Link href="/organizations">
          <Badge variant="gray">{t("upgrade")}</Badge>
        </Link>
      </Tooltip>
    );
  }

  if (to === "enterprise") {
    return (
      <Tooltip content={t("upgrade_to_enterprise")}>
        <Link href="https://cal.com/demo?plan=enterprise">
          <Badge variant="gray">{t("upgrade")}</Badge>
        </Link>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={t("upgrade_to_team")}>
      <Link href="/teams">
        <Badge variant="gray">{t("upgrade")}</Badge>
      </Link>
    </Tooltip>
  );
};
