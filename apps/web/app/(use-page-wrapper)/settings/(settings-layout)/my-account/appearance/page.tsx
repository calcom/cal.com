import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import AppearancePage from "~/settings/my-account/appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_description")
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("appearance")} description={t("appearance_description")}>
      <AppearancePage />
    </SettingsHeader>
  );
};

export default Page;
