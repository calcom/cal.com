import { _generateMetadata, getTranslate } from "app/_utils";

import SystemBlocklistView from "@calcom/web/modules/ee/admin/pages/settings/blocklist";
import SettingsHeader from "@calcom/web/modules/settings/components/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("system_blocklist"),
    (t) => t("system_blocklist_description"),
    undefined,
    undefined,
    "/settings/admin/blocklist"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("system_blocklist")} description={t("system_blocklist_description")}>
      <SystemBlocklistView />
    </SettingsHeader>
  );
};

export default Page;
