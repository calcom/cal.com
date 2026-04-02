import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import SystemBlocklistView from "~/ee/organizations/admin/views/SystemBlocklistView";

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
