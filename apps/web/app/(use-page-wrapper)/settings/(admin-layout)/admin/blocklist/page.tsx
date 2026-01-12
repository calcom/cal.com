import { _generateMetadata, getTranslate } from "app/_utils";

import SystemBlocklistView from "@calcom/web/modules/ee/admin/views/system-block-list-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

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
