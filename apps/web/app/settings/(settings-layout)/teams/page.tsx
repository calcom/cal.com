import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import LegacyPage from "@calcom/features/ee/teams/pages/team-listing-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("create_manage_teams_collaborative")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("teams")} description={t("create_manage_teams_collaborative")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
