import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LegacyPage from "~/settings/admin/oauth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oAuth"),
    (t) => t("admin_oAuth_description"),
    undefined,
    undefined,
    "/settings/admin/oAuth"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("oAuth")} description={t("admin_oAuth_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
