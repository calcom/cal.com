import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const UpgradeOrgsBadge = function UpgradeOrgsBadge({
  translations = {},
}: {
  translations?: Record<string, string>;
}) {
  return (
    <Tooltip content={translations["orgs_upgrade_to_enable_feature"]}>
      <a href="https://cal.com/enterprise" target="_blank">
        <Badge variant="gray">{translations["upgrade"]}</Badge>
      </a>
    </Tooltip>
  );
};
