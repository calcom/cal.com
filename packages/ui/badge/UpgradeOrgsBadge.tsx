import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeOrgsBadge = function UpgradeOrgsBadge() {
  const { t } = useLocale();

  return (
    <Tooltip content={t("orgs_upgrade_to_enable_feature")}>
      <a href="https://cal.com/enterprise" target="_blank">
        <Badge variant="gray">{t("upgrade")}</Badge>
      </a>
    </Tooltip>
  );
};
