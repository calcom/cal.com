import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

/**
 * Badge shown to indicate a feature requires a team plan upgrade
 */
export function UpgradeTeamsBadge() {
  const { t } = useLocale();

  return (
    <Link href="/settings/teams/new" passHref>
      <Badge variant="orange" className="cursor-pointer">
        {t("upgrade_to_teams")}
      </Badge>
    </Link>
  );
}

export default UpgradeTeamsBadge;
