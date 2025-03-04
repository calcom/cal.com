import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import LegacyPage from "~/settings/admin/oauth-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return await _generateMetadata(t("oAuth"), t("admin_oAuth_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return (
    <SettingsHeader title={t("oAuth")} description={t("admin_oAuth_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
