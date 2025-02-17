import { _generateMetadata, getTranslate } from "app/_utils";

import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("privacy"),
    (t) => t("privacy_organization_description")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("privacy")} description={t("privacy_organization_description")}>
      <PrivacyView />
    </SettingsHeader>
  );
};

export default Page;
