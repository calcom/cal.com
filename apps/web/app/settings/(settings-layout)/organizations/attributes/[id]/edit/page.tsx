import { _generateMetadata, getFixedT } from "app/_utils";

import OrgAttributesEditPage from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";
import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attribute"),
    (t) => t("edit_attribute_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("attribute")} description={t("edit_attribute_description")}>
      <OrgAttributesEditPage />
    </SettingsHeader>
  );
};

export default Page;
