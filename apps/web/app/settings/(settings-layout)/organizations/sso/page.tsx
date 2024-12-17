import { _generateMetadata, getTranslate } from "app/_utils";

import OrgSSOView from "@calcom/features/ee/sso/page/orgs-sso-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sso_configuration"),
    (t) => t("sso_configuration_description_orgs")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("sso_configuration")} description={t("sso_configuration_description_orgs")}>
      <OrgSSOView />
    </SettingsHeader>
  );
};

export default Page;
