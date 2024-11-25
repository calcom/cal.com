import { _generateMetadata, getFixedT } from "app/_utils";

import OrgSettingsAttributesPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";
import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attributes"),
    (t) => t("attribute_meta_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("attributes")} description={t("attribute_meta_description")}>
      <OrgSettingsAttributesPage />
    </SettingsHeader>
  );
};

export default Page;
