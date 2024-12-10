import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LegacyPage from "~/settings/admin/oauth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oAuth"),
    (t) => t("admin_oAuth_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");
  return (
    <SettingsHeader title={t("oAuth")} description={t("admin_oAuth_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
