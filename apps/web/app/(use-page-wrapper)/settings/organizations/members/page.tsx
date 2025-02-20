import SettingsLayoutAppDir from "app/(use-page-wrapper)/settings/(settings-layout)/layout";
import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/features/ee/organizations/pages/members";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description")
  );

const Page = async () => {
  const t = await getTranslate();

  const children = (
    <SettingsHeader title={t("organization_members")} description={t("organization_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
  return await SettingsLayoutAppDir({ children, containerClassName: "lg:max-w-screen-2xl" });
};

export default Page;
