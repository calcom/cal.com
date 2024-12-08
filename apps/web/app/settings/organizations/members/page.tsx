import { _generateMetadata, getFixedT } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers } from "next/headers";

import LegacyPage from "@calcom/features/ee/organizations/pages/members";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import SettingsLayoutAppDir from "@calcom/features/settings/appDir/SettingsLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("organization_members")} description={t("organization_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

const getLayout = async (page: React.ReactElement) =>
  await SettingsLayoutAppDir({ children: page, containerClassName: "lg:max-w-screen-2xl" });

export default WithLayout({ ServerPage: Page, getServerLayout: getLayout })<"P">;
