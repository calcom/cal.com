import { _generateMetadata, getFixedT } from "app/_utils";

import { getServerSessionForAppDir } from "@calcom/features/auth/lib/get-server-session-for-app-dir";
import OrgSSOView from "@calcom/features/ee/sso/page/orgs-sso-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description_orgs")
  );

const Page = async () => {
  const session = await getServerSessionForAppDir();
  const t = await getFixedT(session?.user.locale || "en");

  return (
    <SettingsHeader title={t("sso_configuration")} description={t("sso_configuration_description_orgs")}>
      <OrgSSOView />
    </SettingsHeader>
  );
};

export default Page;
