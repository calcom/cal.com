import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import LegacyPage from "@calcom/features/ee/organizations/pages/settings/other-team-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("org_admin_other_teams"),
    (t) => t("org_admin_other_teams_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("org_admin_other_teams")} description={t("org_admin_other_teams_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
