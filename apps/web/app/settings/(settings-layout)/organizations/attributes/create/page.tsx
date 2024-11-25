import { _generateMetadata, getFixedT } from "app/_utils";

import OrgAttributesCreatePage from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";
import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("create_attribute_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("attribute")} description={t("create_attribute_description")}>
      <OrgAttributesCreatePage />
    </SettingsHeader>
  );
};

export default Page;
