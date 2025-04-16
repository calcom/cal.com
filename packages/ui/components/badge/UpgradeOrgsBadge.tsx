import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeOrgsBadge = function UpgradeOrgsBadge({
  translations = {},
}: {
  translations?: Record<string, string>;
}) {
  const { t } = useLocale();

  return (
    <Tooltip content={translations["orgs_upgrade_to_enable_feature"] || t("orgs_upgrade_to_enable_feature")}>
      <a href="https://cal.com/enterprise" target="_blank">
        <Badge variant="gray">{translations["upgrade"] || t("upgrade")}</Badge>
      </a>
    </Tooltip>
  );
};
