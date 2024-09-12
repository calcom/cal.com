import { getFixedT, _generateMetadata } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import { AdminAPIView } from "@calcom/features/ee/organizations/pages/settings/admin-api";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => `${t("admin")} ${t("api_reference")}`,
    (t) => t("leverage_our_api")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();

  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader
      title={`${t("admin")} ${t("api_reference")}`}
      description={t("leverage_our_api")}
      borderInShellHeader={false}>
      <AdminAPIView />
    </SettingsHeader>
  );
};

export default Page;
