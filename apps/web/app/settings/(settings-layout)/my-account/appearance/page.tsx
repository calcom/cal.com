import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { headers } from "next/headers";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import AppearancePage from "~/settings/my-account/appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("appearance")} description={t("appearance_description")}>
      <AppearancePage />
    </SettingsHeader>
  );
};

export default Page;
