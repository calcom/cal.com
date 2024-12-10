import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import LegacyPage from "@calcom/features/ee/teams/pages/team-members-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_members"),
    (t) => t("members_team_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader title={t("team_members")} description={t("members_team_description")}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
