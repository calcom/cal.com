import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("privacy"),
    (t) => t("privacy_organization_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("privacy")} description={t("privacy_organization_description")}>
      <PrivacyView />
    </SettingsHeader>
  );
};

export default Page;
