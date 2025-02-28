import { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import AppearancePage from "~/settings/my-account/appearance-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("appearance"), t("appearance_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader title={t("appearance")} description={t("appearance_description")}>
      <AppearancePage />
    </SettingsHeader>
  );
};

export default Page;
