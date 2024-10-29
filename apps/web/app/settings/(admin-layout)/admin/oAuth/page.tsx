import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LegacyPage from "~/settings/admin/oauth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oAuth"),
    (t) => t("admin_oAuth_description")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");
  return (
    <SettingsHeader title={t("oAuth")} description={t("admin_oAuth_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
