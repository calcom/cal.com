import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("privacy"),
    (t) => t("privacy_organization_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("privacy")} description={t("privacy_organization_description")}>
      <PrivacyView />
    </SettingsHeader>
  );
};

export default Page;
