import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import LegacyPage from "@calcom/features/ee/teams/pages/team-profile-view";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("profile"), t("profile_team_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

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
