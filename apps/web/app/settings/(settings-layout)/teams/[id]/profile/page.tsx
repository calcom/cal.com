import { _generateMetadata, getFixedT } from "app/_utils";
import { headers } from "next/headers";

import LegacyPage from "@calcom/features/ee/teams/pages/team-profile-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_team_description")
  );

const Page = async () => {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  const t = await getFixedT(locale ?? "en");

  return (
    <SettingsHeader
      title={t("profile")}
      description={t("profile_team_description")}
      borderInShellHeader={true}>
      <LegacyPage />
    </SettingsHeader>
  );
};

export default Page;
